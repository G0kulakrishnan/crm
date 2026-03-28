import React from 'react';
import { fmt, fmtD, numberToWords } from '../../utils/helpers';

export default function DocumentTemplate({ data, profile, type = 'Invoice', preview = false, settings }) {
  const profileTemplate = type === 'Invoice' ? profile?.invoiceTemplate : profile?.quotationTemplate;
  const t = profileTemplate || data.template || 'Classic';
  const items = Array.isArray(data.items) 
    ? data.items 
    : (typeof data.items === 'string' ? JSON.parse(data.items) : []);

  const ptots = (() => {
    const sub = items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0);
    const taxTotal = items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0) * (it.taxRate || 0) / 100, 0);
    const discAmt = data.discType === '₹' ? (parseFloat(data.disc) || 0) : (sub * (parseFloat(data.disc) || 0) / 100);
    const total = Math.round(sub - discAmt + taxTotal + (parseFloat(data.adj) || 0));
    return { sub, taxTotal, discAmt, total };
  })();

  const clientMatch = data.clientDetails || {}; 
  const isInterState = profile?.bizState && clientMatch?.state && profile.bizState !== clientMatch.state;

  const A4_STYLE = preview ? {
    width: '210mm',
    minHeight: '297mm',
    padding: '15mm',
    background: '#fff',
    position: 'relative',
    boxSizing: 'border-box',
    color: '#000',
  } : {
    width: '210mm',
    minHeight: '297mm',
    padding: '15mm',
    margin: '0 auto', // Removed 10mm top/bottom margin for better print alignment
    background: '#fff',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    position: 'relative',
    boxSizing: 'border-box',
    color: '#000'
  };

  const renderContent = () => {
    if (t === 'Spreadsheet') {
      const colNo = '40px', colQty = '60px', colRate = '100px', colGst = '80px', colAmt = '120px';
      
      return (
        <div className="zoho-template" style={{ fontSize: '11px', color: '#111', fontFamily: '"Inter", sans-serif' }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            
            /* Screen / General Styles (Clean Modern B2B) */
            .z-table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; }
            .z-table th { background: #f8f9fa; color: #444; padding: 12px 10px; text-transform: uppercase; font-size: 10px; font-weight: 700; text-align: left; border-bottom: 2px solid #ddd; }
            .z-table td { padding: 14px 10px; border-bottom: 1px solid #eee; vertical-align: top; color: #111; font-size: 11px; }
            
            .z-summary { width: 100%; border-collapse: collapse; }
            .z-summary td { padding: 8px 10px; font-size: 12px; text-align: right; border: none; }
            .z-summary td:first-child { color: #555; text-align: left; }
            .z-summary tr.z-total td { font-weight: 800; font-size: 16px; color: #000; border-top: 2px solid #000; border-bottom: 2px double #000; padding: 15px 10px; }
            
            /* Print-only Overrides (Rigid #000 Borders for perfect PDFs) */
            @media print {
              @page { size: A4; margin: 12mm 15mm; } 
              body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; background: #fff; }
              .a4-container { padding: 0 !important; margin: 0 !important; box-shadow: none !important; border: none !important; width: 100% !important; height: auto !important; min-height: 0 !important; }
              .no-print { display: none !important; }
              .zoho-template { min-height: 0 !important; display: block !important; }
              
              .z-table { page-break-inside: auto; border-bottom: 1px solid #000; }
              .z-table tr { page-break-inside: avoid; page-break-after: auto; }
              .z-table th { background: #f0f0f0 !important; color: #000 !important; border-bottom: 2px solid #000 !important; border-top: 1px solid #000 !important; }
              .z-table td { border-bottom: 1px solid #aaa !important; }
              .z-table thead { display: table-header-group; }
              
              .z-summary td { color: #111 !important; }
              .z-summary tr.z-total td { border-top: 2px solid #000 !important; border-bottom: 2px solid #000 !important; }
              
              .avoid-break { page-break-inside: avoid; }
            }
          `}</style>

          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '260mm' }}>
            {/* Header: Logo and Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: 'flex-start' }}>
              <div style={{ width: '55%' }}>
                {profile.logo && <img src={profile.logo} alt="Logo" style={{ height: '70px', maxWidth: '200px', objectFit: 'contain', marginBottom: '15px' }} />}
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>{profile.bizName}</div>
                <div style={{ fontSize: '12px', color: '#555', whiteSpace: 'pre-wrap', lineHeight: '1.6', maxWidth: '300px' }}>{profile.address}</div>
                {profile.gstin && <div style={{ fontSize: '11px', marginTop: '8px', fontWeight: '700', color: '#333' }}>GSTIN: {profile.gstin}</div>}
              </div>
              <div style={{ width: '40%', textAlign: 'right' }}>
                <h1 style={{ fontSize: '36px', fontWeight: '200', margin: '0 0 20px 0', color: '#000', textTransform: 'uppercase', letterSpacing: '1px' }}>{type === 'Invoice' ? 'TAX INVOICE' : 'QUOTATION'}</h1>
                <div style={{ display: 'inline-block', textAlign: 'left', minWidth: '240px', borderTop: '2px solid #111', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                    <span style={{ color: '#555', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Reference</span>
                    <strong style={{ fontSize: '12px', color: '#111' }}>{data.no}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                    <span style={{ color: '#555', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Date</span>
                    <strong style={{ fontSize: '12px', color: '#111' }}>{fmtD(data.date)}</strong>
                  </div>
                  {(type === 'Invoice' && data.dueDate) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                      <span style={{ color: '#555', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Due Date</span>
                      <strong style={{ fontSize: '12px', color: '#111' }}>{fmtD(data.dueDate)}</strong>
                    </div>
                  )}
                  {(type !== 'Invoice' && data.validUntil) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                      <span style={{ color: '#555', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Valid Until</span>
                      <strong style={{ fontSize: '12px', color: '#111' }}>{fmtD(data.validUntil)}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To & Ship To */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
              <div style={{ width: '45%' }}>
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '700', marginBottom: '8px', letterSpacing: '0.5px' }}>Bill To</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#111', marginBottom: '6px' }}>{clientMatch.companyName || data.companyName || data.client}</div>
                {clientMatch.address && <div style={{ fontSize: '12px', color: '#444', whiteSpace: 'pre-wrap', lineHeight: '1.6', marginTop: '6px' }}>{clientMatch.address}</div>}
                {clientMatch.gstin && <div style={{ fontSize: '11px', marginTop: '10px', fontWeight: '700', color: '#333' }}>GSTIN: {clientMatch.gstin}</div>}
              </div>
              {data.shipTo ? (
                <div style={{ width: '45%' }}>
                  <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '700', marginBottom: '8px', letterSpacing: '0.5px' }}>Ship To</div>
                  <div style={{ fontSize: '13px', color: '#444', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{data.shipTo}</div>
                </div>
              ) : null}
            </div>

            {/* Items Table */}
            <table className="z-table">
              <thead>
                <tr>
                  <th style={{ width: colNo, textAlign: 'center' }}>#</th>
                  <th>Item & Description</th>
                  <th style={{ width: colQty, textAlign: 'center' }}>Qty</th>
                  <th style={{ width: colRate, textAlign: 'right' }}>Rate</th>
                  {isInterState ? (
                    <th style={{ width: colGst, textAlign: 'right' }}>IGST</th>
                  ) : (
                    <>
                      <th style={{ width: colGst, textAlign: 'right' }}>CGST</th>
                      <th style={{ width: colGst, textAlign: 'right' }}>SGST</th>
                    </>
                  )}
                  <th style={{ width: colAmt, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const itemTotal = (it.qty || 0) * (it.rate || 0);
                  const taxRate = it.taxRate || 0;
                  const taxAmt = itemTotal * taxRate / 100;
                  return (
                    <tr key={i}>
                      <td style={{ textAlign: 'center', color: '#666' }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: '700', fontSize: '12px' }}>{it.name}</div>
                        {it.sku && <div style={{ fontSize: '10px', fontWeight: '500', color: '#666', marginTop: '4px' }}>Code: {it.sku}</div>}
                        {it.desc && <div style={{ fontSize: '11px', color: '#444', marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{it.desc}</div>}
                      </td>
                      <td style={{ textAlign: 'center' }}>{it.qty.toFixed(2)} {it.unit || ''}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(it.rate).replace('₹', '')}</td>
                      {isInterState ? (
                        <td style={{ textAlign: 'right', color: '#555' }}>
                          <div>{itemTotal === 0 ? '-' : fmt(taxAmt).replace('₹', '')}</div>
                          <div style={{ fontSize: '9px', opacity: 0.7 }}>({taxRate}%)</div>
                        </td>
                      ) : (
                        <>
                          <td style={{ textAlign: 'right', color: '#555' }}>
                            <div>{itemTotal === 0 ? '-' : fmt(taxAmt / 2).replace('₹', '')}</div>
                            <div style={{ fontSize: '9px', opacity: 0.7 }}>({taxRate / 2}%)</div>
                          </td>
                          <td style={{ textAlign: 'right', color: '#555' }}>
                            <div>{itemTotal === 0 ? '-' : fmt(taxAmt / 2).replace('₹', '')}</div>
                            <div style={{ fontSize: '9px', opacity: 0.7 }}>({taxRate / 2}%)</div>
                          </td>
                        </>
                      )}
                      <td style={{ textAlign: 'right', fontWeight: '700' }}>{fmt(itemTotal).replace('₹', '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Totals & Footer Grid - Kept together on page break */}
            <div className="avoid-break" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '40px', marginTop: '10px', paddingTop: '10px' }}>
              
              {/* Left Side: Notes, Terms, Bank */}
              <div>
                <div style={{ marginBottom: '25px' }}>
                  <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px' }}>Total In Words</div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#111', fontStyle: 'italic' }}>{numberToWords(ptots.total)}</div>
                </div>

                {profile.accHolder && (
                  <div style={{ marginBottom: '25px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bank Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 10px 1fr', gap: '6px', fontSize: '11px', color: '#333' }}>
                      <span style={{ color: '#666' }}>Bank Name</span><span>:</span><strong style={{ color: '#111' }}>{profile.bankName}</strong>
                      <span style={{ color: '#666' }}>Account Name</span><span>:</span><strong style={{ color: '#111' }}>{profile.accHolder}</strong>
                      <span style={{ color: '#666' }}>Account No.</span><span>:</span><strong style={{ color: '#111' }}>{profile.accountNo}</strong>
                      <span style={{ color: '#666' }}>IFSC Code</span><span>:</span><strong style={{ color: '#111' }}>{profile.ifsc}</strong>
                      {profile.accType && <><span style={{ color: '#666' }}>Account Type</span><span>:</span><strong>{profile.accType}</strong></>}
                    </div>
                    {profile.bankExtra && <div style={{ marginTop: '10px', fontSize: '10px', color: '#555', borderTop: '1px solid #eee', paddingTop: '10px' }}>{profile.bankExtra}</div>}
                  </div>
                )}

                {data.notes && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#111', marginBottom: '6px', textTransform: 'uppercase' }}>Notes</div>
                    <div style={{ fontSize: '11px', color: '#555', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{data.notes}</div>
                  </div>
                )}
                
                {data.terms && (
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#111', marginBottom: '6px', textTransform: 'uppercase' }}>Terms & Conditions</div>
                    <div style={{ fontSize: '11px', color: '#555', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{data.terms}</div>
                  </div>
                )}
              </div>

              {/* Right Side: Totals */}
              <div>
                <table className="z-summary">
                  <tbody>
                    <tr><td>Sub Total</td><td>{fmt(ptots.sub).replace('₹', '')}</td></tr>
                    {ptots.discAmt > 0 && <tr><td>Discount ({data.discType === '₹' ? 'Flat' : `${data.disc}%`})</td><td style={{ color: '#d97706' }}>- {fmt(ptots.discAmt).replace('₹', '')}</td></tr>}
                    {ptots.taxTotal > 0 && (
                      isInterState ? (
                        <tr><td>IGST</td><td>{fmt(ptots.taxTotal).replace('₹', '')}</td></tr>
                      ) : (
                        <>
                          <tr><td>CGST</td><td>{fmt(ptots.taxTotal / 2).replace('₹', '')}</td></tr>
                          <tr><td>SGST</td><td>{fmt(ptots.taxTotal / 2).replace('₹', '')}</td></tr>
                        </>
                      )
                    )}
                    {data.adj !== 0 && <tr><td>Adjustment</td><td>{data.adj > 0 ? '+' : ''}{fmt(data.adj).replace('₹', '')}</td></tr>}
                    <tr className="z-total"><td>Total</td><td style={{ whiteSpace: 'nowrap' }}>{fmt(ptots.total)}</td></tr>
                    {type === 'Invoice' && (
                      <tr><td style={{ paddingTop: '15px', color: '#111', fontWeight: '800' }}>Balance Due</td><td style={{ paddingTop: '15px', color: '#111', fontWeight: '800', fontSize: '14px' }}>{fmt(ptots.total)}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 'auto', fontSize: '10px', color: '#888', paddingTop: '40px' }}>
              This is a computer-generated document.
            </div>

            {/* External Footer Branding Props */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '10px', fontWeight: '600', color: '#666', borderTop: '1px solid #eee', paddingTop: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {settings?.showBranding !== false && (
                  <>POWERED BY <strong style={{ color: '#000', marginLeft: '4px' }}>{settings?.brandName || 'T2GCRM'}</strong></>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Standard Template Wrapper for others
    return (
      <div style={{ fontFamily: t === 'Modern' ? 'Outfit, sans-serif' : 'sans-serif' }}>
        <style>{`
          @media print {
            @page { size: A4; margin: 10mm; }
            body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; }
            .a4-container { box-shadow: none !important; margin: 0 !important; border: none !important; padding: 0 !important; width: auto !important; height: auto !important; min-height: auto !important; }
            .no-print { display: none !important; }
          }
        `}</style>
        {/* Header Section */}
        {t === 'Modern' ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 50, background: 'var(--accent)', color: '#fff', padding: 30, borderRadius: 12, alignItems: 'center' }}>
             <div><h1 style={{ margin: 0, fontSize: 42, letterSpacing: -1 }}>{type.toUpperCase()}</h1><div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>No: {data.no} | {fmtD(data.date)}</div></div>
             <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 20 }}>
               {profile.logo && <img src={profile.logo} alt="Logo" style={{ height: 60, width: 60, objectFit: 'contain', background: '#fff', padding: 5, borderRadius: 8 }} />}
               <div>
                 <h2 style={{ margin: 0 }}>{profile.bizName}</h2>
                 <div style={{ fontSize: 12, opacity: 0.9 }}>{profile.email} | {profile.phone}</div>
               </div>
             </div>
          </div>
        ) : t === 'Minimal' ? (
        <div style={{ marginBottom: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
           <div>
             <h1 style={{ fontSize: 24, fontWeight: 300, margin: '0 0 10px 0' }}>{type} <span>#{data.no}</span></h1>
             <div style={{ fontSize: 12, color: '#999' }}>Issued on {fmtD(data.date)}</div>
           </div>
           {profile.logo && <img src={profile.logo} alt="Logo" style={{ height: 50, width: 50, objectFit: 'contain' }} />}
        </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              {profile.logo && <img src={profile.logo} alt="Logo" style={{ height: 70, width: 70, objectFit: 'contain' }} />}
              <div>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>{type.toUpperCase()}</h1>
                <div style={{ fontSize: 13, color: '#666', marginTop: 5 }}>No: <strong>{data.no}</strong></div>
                <div style={{ fontSize: 13, color: '#666' }}>Date: {fmtD(data.date)}</div>
                {data.dueDate && <div style={{ fontSize: 13, color: '#666' }}>Due Date: {fmtD(data.date)}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{profile.bizName || 'Your Business'}</h2>
              <div style={{ fontSize: 13, color: '#666', marginTop: 4, whiteSpace: 'pre-wrap' }}>{profile.address}</div>
              {profile.gstin && <div style={{ fontSize: 13, color: '#666' }}>GSTIN: {profile.gstin}</div>}
            </div>
          </div>
        )}

        {/* Client Section */}
        <div style={{ marginBottom: 40, borderLeft: t === 'Classic' ? '3px solid var(--accent)' : 'none', paddingLeft: t === 'Classic' ? 15 : 0, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 60 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase' }}>Billed To</div>
              <div style={{ fontSize: t === 'Modern' ? 20 : 16, fontWeight: 700, marginTop: 4 }}>
                {clientMatch.companyName || data.companyName || data.client}
              </div>
              {clientMatch?.address && <div style={{ fontSize: 12, color: '#666', marginTop: 10, whiteSpace: 'pre-wrap' }}>{clientMatch.address}</div>}
              {clientMatch?.gstin && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>GSTIN: {clientMatch.gstin}</div>}
            </div>
            {data.shipTo && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase' }}>Ship To</div>
                <div style={{ fontSize: 13, color: '#333', marginTop: 4, whiteSpace: 'pre-wrap' }}>{data.shipTo}</div>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
          <thead>
            <tr style={{ background: t === 'Modern' ? '#f8fafc' : 'transparent', borderBottom: t === 'Minimal' ? '1px solid #eee' : '2px solid #000' }}>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12 }}>Description</th>
              <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12 }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12 }}>Rate</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12 }}>Tax</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '14px 8px', fontSize: 13 }}>
                  <div><strong>{it.name}</strong></div>
                  {it.sku && <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>Code: {it.sku}</div>}
                  {it.desc && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{it.desc}</div>}
                </td>
                <td style={{ padding: '14px 8px', fontSize: 13, textAlign: 'center' }}>{it.qty} {it.unit || ''}</td>
                <td style={{ padding: '14px 8px', fontSize: 13, textAlign: 'right' }}>{fmt(it.rate)}</td>
                <td style={{ padding: '14px 8px', fontSize: 13, textAlign: 'right' }}>{it.taxRate}%</td>
                <td style={{ padding: '14px 8px', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{fmt(it.qty * it.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ width: '45%', fontSize: 12, color: '#555' }}>
            {data.notes && <div style={{ marginBottom: 15 }}><strong>Notes:</strong><br/>{data.notes}</div>}
            {data.terms && <div><strong>Terms:</strong><br/>{data.terms}</div>}
          </div>
          <div style={{ width: '40%', background: t === 'Modern' ? '#f8fafc' : 'transparent', padding: t === 'Modern' ? 20 : 0, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
              <span style={{ color: '#666' }}>Subtotal</span><span>{fmt(ptots.sub)}</span>
            </div>
            {ptots.discAmt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#d97706' }}><span>Discount ({data.discType === '₹' ? 'Flat' : `${data.disc}%`})</span><span>- {fmt(ptots.discAmt)}</span></div>}
            {ptots.taxTotal > 0 && (
              isInterState ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}><span>IGST</span><span>{fmt(ptots.taxTotal)}</span></div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}><span>CGST</span><span>{fmt(ptots.taxTotal / 2)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}><span>SGST</span><span>{fmt(ptots.taxTotal / 2)}</span></div>
                </>
              )
            )}
            {data.adj !== 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}><span>Adjustment</span><span>{data.adj > 0 ? '+' : ''}{fmt(data.adj)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0 0 0', fontSize: 20, fontWeight: 800, borderTop: t === 'Minimal' ? '1px solid #eee' : '2px solid #000', marginTop: 10 }}>
              <span>Total</span><span style={{ color: '#000' }}>{fmt(ptots.total)}</span>
            </div>
          </div>
        </div>

        {/* Bank & QR Section */}
        {(profile.bankName || profile.qrCode) && (
          <div style={{ marginTop: 40, borderTop: '1px solid #eee', paddingTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            {profile.bankName && (
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#666', marginBottom: 8, textTransform: 'uppercase' }}>Bank Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', rowGap: 4 }}>
                  <span style={{ color: '#666' }}>Account:</span><span style={{ fontWeight: 600 }}>{profile.accHolder}</span>
                  <span style={{ color: '#666' }}>Bank:</span><span>{profile.bankName}</span>
                  <span style={{ color: '#666' }}>A/C No:</span><span style={{ fontWeight: 600 }}>{profile.accountNo}</span>
                  <span style={{ color: '#666' }}>IFSC:</span><span>{profile.ifsc}</span>
                </div>
                {profile.bankExtra && (
                  <div style={{ marginTop: '12px', color: '#000', whiteSpace: 'pre-wrap', borderTop: '1px solid #eee', paddingTop: '8px', fontWeight: '700', fontSize: '12px' }}>
                    {profile.bankExtra}
                  </div>
                )}
              </div>
            )}
            {profile.qrCode && (
              <div style={{ textAlign: 'right' }}>
                <img src={profile.qrCode} alt="Payment QR" style={{ height: 100, width: 100, borderRadius: 4 }} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="a4-container" style={A4_STYLE}>
      {renderContent()}
    </div>
  );
}
