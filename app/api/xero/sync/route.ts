import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { xeroApiGet } from '@/lib/xero/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface XeroInvoice {
  InvoiceID: string
  InvoiceNumber: string
  Reference: string
  Type: 'ACCREC' | 'ACCPAY'
  Status: string
  CurrencyCode: string
  SubTotal: number
  TotalTax: number
  Total: number
  AmountDue: number
  AmountPaid: number
  Date: string
  DueDate: string
  IsDiscounted: boolean
  HasAttachments: boolean
  Contact: { ContactID: string; Name: string }
  LineItems: Array<{
    Description: string
    Quantity: number
    UnitAmount: number
    LineAmount: number
    AccountCode: string
  }>
}

// POST /api/xero/sync — sync invoices from Xero and calculate MRR
export async function POST() {
  try {
    // Log sync start
    const { data: syncLog } = await supabase
      .from('bl_xero_sync_log')
      .insert({ sync_type: 'invoices', status: 'started' })
      .select('id')
      .single()

    // Fetch ACCREC (sales) invoices from last 12 months
    const since = new Date()
    since.setMonth(since.getMonth() - 12)
    const sinceStr = since.toISOString().split('T')[0]

    const data = await xeroApiGet<{ Invoices: XeroInvoice[] }>(
      `/Invoices?where=Type=="ACCREC"&&Date>DateTime(${since.getFullYear()},${since.getMonth() + 1},${since.getDate()})&order=Date DESC`
    )

    const invoices = data.Invoices || []

    // Parse Xero date format: "/Date(1234567890000+0000)/" or ISO string
    const parseXeroDate = (dateStr: string | null | undefined): string | null => {
      if (!dateStr) return null
      const match = dateStr.match(/\/Date\((\d+)[+-]\d+\)\//)
      if (match) {
        return new Date(parseInt(match[1])).toISOString().split('T')[0]
      }
      if (dateStr.includes('T')) return dateStr.split('T')[0]
      return dateStr
    }

    // Upsert invoices into Supabase
    let synced = 0
    const errors: string[] = []
    for (const inv of invoices) {
      const row = {
        xero_invoice_id: inv.InvoiceID,
        xero_contact_id: inv.Contact?.ContactID || null,
        contact_name: inv.Contact?.Name || null,
        invoice_number: inv.InvoiceNumber || null,
        reference: inv.Reference || null,
        invoice_type: inv.Type,
        status: inv.Status,
        currency_code: inv.CurrencyCode || 'GBP',
        sub_total: inv.SubTotal || 0,
        total_tax: inv.TotalTax || 0,
        total: inv.Total || 0,
        amount_due: inv.AmountDue || 0,
        amount_paid: inv.AmountPaid || 0,
        date: parseXeroDate(inv.Date),
        due_date: parseXeroDate(inv.DueDate),
        line_items: inv.LineItems || [],
        synced_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('bl_xero_invoices').upsert(row, {
        onConflict: 'xero_invoice_id',
      })

      if (error) {
        console.error('Invoice upsert error:', inv.InvoiceID, error.message)
        errors.push(`${inv.InvoiceNumber}: ${error.message}`)
      } else {
        synced++
      }
    }

    // Calculate MRR from AUTHORISED + PAID invoices in the current month
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`

    const { data: mrrData } = await supabase
      .from('bl_xero_invoices')
      .select('total')
      .eq('invoice_type', 'ACCREC')
      .in('status', ['AUTHORISED', 'PAID'])
      .gte('date', monthStart)
      .lt('date', monthEnd)

    const mrr = (mrrData || []).reduce((sum, inv) => sum + Number(inv.total || 0), 0)

    // Update revenue targets with actual MRR
    await supabase
      .from('bl_revenue_targets')
      .update({ consulting_actual: mrr, updated_at: new Date().toISOString() })
      .eq('id', '5b2c7dd8-5e2f-41ca-aef8-d1544347659e')

    // Log sync completion
    if (syncLog?.id) {
      await supabase
        .from('bl_xero_sync_log')
        .update({
          status: 'completed',
          records_synced: synced,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id)
    }

    return NextResponse.json({
      success: true,
      invoices_synced: synced,
      errors: errors.length > 0 ? errors : undefined,
      current_mrr: mrr,
      month: monthStart,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Xero sync error:', message)

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// GET /api/xero/sync — get sync status and current MRR
export async function GET() {
  try {
    // Get latest sync
    const { data: lastSync } = await supabase
      .from('bl_xero_sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    // Calculate current month MRR from cached invoices
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`

    const { data: mrrData } = await supabase
      .from('bl_xero_invoices')
      .select('contact_name, total, status')
      .eq('invoice_type', 'ACCREC')
      .in('status', ['AUTHORISED', 'PAID'])
      .gte('date', monthStart)
      .lt('date', monthEnd)

    const mrr = (mrrData || []).reduce((sum, inv) => sum + Number(inv.total || 0), 0)

    // Check Xero connection status
    const { data: token } = await supabase
      .from('bl_xero_tokens')
      .select('tenant_name, expires_at, updated_at')
      .limit(1)
      .single()

    return NextResponse.json({
      connected: !!token,
      organisation: token?.tenant_name,
      current_mrr: mrr,
      invoices_this_month: mrrData || [],
      last_sync: lastSync,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ connected: false, error: message }, { status: 500 })
  }
}
