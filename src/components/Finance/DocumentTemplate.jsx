import React from 'react';
import { fmt, fmtD, numberToWords } from '../../utils/helpers';

export default function DocumentTemplate({ data, profile, type = 'Invoice', preview = false, settings }) {
  const profileTemplate = type === 'Invoice' ? profile?.invoiceTemplate : profile?.quotationTemplate;
  const t = profileTemplate || data.template || 'Classic';
  const ptots = (() => {
    const sub = (data.items || []).reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0);
    const taxTotal = (data.items || []).reduce((s, it) => s + (it.qty || 0) * (it.rate || 0) * (it.taxRate || 0) / 100, 0);
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
    margin: '10mm auto',
    background: '#fff',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    position: 'relative',
    boxSizing: 'border-box',
    color: '#000'
  };

  const renderContent = () => {
    if (t === 'Spreadsheet') {
      const colNo = '30px', colQty = '50px', colRate = '85px', colGst = '40px', colAmt = '110px';
      const getDynFS = (val, def = '11px', lg = '11px') => {
        const s = String(val || '').replace(/[^\d.-]/g, '');
        if (s.length > 12) return '8px';
        if (s.length > 10) return '9px';
        return def;
      };

      
      return (
        <div className="spreadsheet-template" style={{ fontSize: '11px', lineHeight: '1.4', fontFamily: '"Inter", sans-serif', letterSpacing: '0.01em' }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            @media print {
              body { margin: 0; padding: 0; background: #fff; }
              .a4-container { box-shadow: none !important; margin: 0 !important; border: none !important; padding: 0 !important; }
              .no-print { display: none !important; }
            }
            .s-table { width: 100%; border-collapse: collapse; border: none; }
            .s-table th { border: 1px solid #000; padding: 7px 4px; background: #f9fafb; font-weight: 700; color: #111; text-transform: uppercase; letter-spacing: 0.03em; font-size: 10px; }
            .s-table td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 10px 8px; vertical-align: top; border-bottom: none; color: #000; }
          `}</style>
          
          <div style={{ border: '2px solid #000', minHeight: '280mm', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            {/* Header Section */}
            <div style={{ padding: '20px 20px 0 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  {profile.logo && <img src={profile.logo} alt="Logo" style={{ height: '100px', width: '100px', objectFit: 'contain' }} />}
                  <div>
                    <h1 style={{ margin: '0', fontSize: '22px', fontWeight: '900', textTransform: 'uppercase', lineHeight: '1.2' }}>{profile.bizName}</h1>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '11px', marginTop: '6px', maxWidth: '400px', fontWeight: '500', lineHeight: '1.4' }}>{profile.address}</div>
                    {profile.gstin && <div style={{ fontWeight: '700', marginTop: '8px', fontSize: '11px' }}>GSTIN: {profile.gstin}</div>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '500', color: '#000' }}>{type === 'Invoice' ? 'TAX INVOICE' : 'QUOTATION'}</h1>
                </div>
              </div>

              {/* Document Detail Box */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #000', borderBottom: 'none' }}>
                <div style={{ borderRight: '1px solid #000', padding: '10px 12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 10px 1fr', gap: '4px', fontSize: '11px', lineHeight: '1.5' }}>
                    <span style={{ fontWeight: '500' }}>#</span><span>:</span><strong>{data.no}</strong>
                    <span style={{ fontWeight: '500' }}>{type} Date</span><span>:</span><strong>{fmtD(data.date)}</strong>
                    {(data.terms || data.notes) && <><span style={{ fontWeight: '500' }}>Terms</span><span>:</span><strong>{data.terms || data.notes}</strong></>}
                    {type === 'Invoice' ? (
                      <><span style={{ fontWeight: '500' }}>Due Date</span><span>:</span><strong>{fmtD(data.dueDate) || '-'}</strong></>
                    ) : (
                      <><span style={{ fontWeight: '500' }}>Valid Until</span><span>:</span><strong>{fmtD(data.validUntil) || '-'}</strong></>
                    )}
                  </div>
                </div>
                <div style={{ padding: '10px 12px' }}>
                  {data.shipTo && (
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', marginBottom: '2px' }}>Ship To</div>
                      <div style={{ fontSize: '11px', whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>{data.shipTo}</div>
                    </div>
                  )}
                  {(data.amcDetails || (data.amcStart && data.amcEnd)) && (
                    <div style={{ marginTop: data.shipTo ? '8px' : '0' }}>
                      {data.amcDetails && <div>
                        <span style={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' }}>AMC Plan:</span>
                        <span style={{ fontSize: '11px', marginLeft: '5px' }}>{data.amcDetails}</span>
                      </div>}
                      {(data.amcStart && data.amcEnd) && (
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#000', marginTop: '2px' }}>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#666', marginRight: '5px' }}>AMC Period:</span>
                          {fmtD(data.amcStart)} To {fmtD(data.amcEnd)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Billing Info Box */}
              <div style={{ border: '1px solid #000', backgroundColor: '#f9fafb', padding: '5px 12px', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' }}>Bill To</div>
              <div style={{ border: '1px solid #000', borderTop: 'none', padding: '12px' }}>
                <div style={{ fontWeight: '900', fontSize: '15px', textTransform: 'uppercase' }}>{data.client}</div>
                {clientMatch.gstin && <div style={{ fontWeight: '700', marginTop: '5px' }}>GSTIN: {clientMatch.gstin}</div>}
                {clientMatch.address && <div style={{ marginTop: '10px', fontSize: '12px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{clientMatch.address}</div>}
              </div>
            </div>

            {/* Spacer to connect lines */}
            <div style={{ padding: '0 20px' }}>
              <div style={{ height: '20px', borderLeft: '1px solid #000', borderRight: '1px solid #000' }}></div>
            </div>

            {/* Items Table Area */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0 20px' }}>
              <table className="s-table" style={{ borderBottom: '1px solid #000' }}>
                <thead>
                  <tr style={{ fontSize: '11px' }}>
                    <th style={{ width: colNo }} rowSpan="2">#</th>
                    <th style={{ textAlign: 'center' }} rowSpan="2">ITEM & DESCRIPTION</th>
                    <th style={{ width: colQty, textAlign: 'center' }} rowSpan="2">QTY</th>
                    <th style={{ width: colRate, textAlign: 'center' }} rowSpan="2">RATE</th>
                    <th style={{ width: `calc(${colGst} * 2)`, textAlign: 'center' }} colSpan="2">CGST</th>
                    <th style={{ width: `calc(${colGst} * 2)`, textAlign: 'center' }} colSpan="2">SGST</th>
                    <th style={{ width: colAmt, textAlign: 'center' }} rowSpan="2">AMOUNT</th>
                  </tr>
                  <tr style={{ fontSize: '10px' }}>
                    <th style={{ width: colGst, textAlign: 'center' }}>%</th>
                    <th style={{ width: colGst, textAlign: 'center' }}>AMT</th>
                    <th style={{ width: colGst, textAlign: 'center' }}>%</th>
                    <th style={{ width: colGst, textAlign: 'center' }}>AMT</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it, i) => {
                    const itemTotal = (it.qty || 0) * (it.rate || 0);
                    const taxRate = it.taxRate || 0;
                    const taxAmt = itemTotal * taxRate / 100;
                    return (
                      <tr key={i}>
                        <td style={{ textAlign: 'center' }}>{i + 1}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: '700' }}>{it.name}</div>
                          {it.desc && <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px', whiteSpace: 'pre-wrap' }}>{it.desc}</div>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{it.qty.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontSize: getDynFS(it.rate) }}>{fmt(it.rate).replace('₹', '')}</td>
                        <td style={{ textAlign: 'center' }}>{isInterState ? 0 : (taxRate / 2)}%</td>
                        <td style={{ textAlign: 'right', fontSize: getDynFS(taxAmt / 2) }}>{isInterState ? '-' : fmt(taxAmt / 2).replace('₹', '')}</td>
                        <td style={{ textAlign: 'center' }}>{isInterState ? 0 : (taxRate / 2)}%</td>
                        <td style={{ textAlign: 'right', fontSize: getDynFS(taxAmt / 2) }}>{isInterState ? '-' : fmt(taxAmt / 2).replace('₹', '')}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700', fontSize: getDynFS(itemTotal) }}>{fmt(itemTotal).replace('₹', '')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Filler Spacer - Grows to push everything down */}
            <div style={{ flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column' }}>
               <div style={{ flex: 1, borderLeft: '1px solid #000', borderRight: '1px solid #000' }}>
               </div>
            </div>

            {/* Terms & Notes - Placed exactly above the Bank Details/Totals Box */}
            {(data.terms || data.notes) && (
              <div style={{ margin: '0 20px', padding: '15px 20px', borderLeft: '1px solid #000', borderRight: '1px solid #000' }}>
                {data.terms && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '4px' }}>Terms:</div>
                    <div style={{ fontSize: '11px', whiteSpace: 'pre-wrap', color: '#333' }}>{String(data.terms)}</div>
                  </div>
                )}
                {data.notes && (
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '4px' }}>Notes:</div>
                    <div style={{ fontSize: '11px', whiteSpace: 'pre-wrap', color: '#333' }}>{String(data.notes)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Box */}
            <div style={{ padding: '0 20px 20px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', border: '1px solid #000' }}>
                {/* Left Side: Detail & Bank */}
                <div style={{ borderRight: '1px solid #000', padding: '15px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '700', color: '#666', marginBottom: '4px' }}>Total In Words</div>
                    <div style={{ fontWeight: '900', fontStyle: 'italic', fontSize: '12px', color: '#000' }}>{numberToWords(ptots.total)}</div>
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px', fontSize: '11px', textDecoration: 'underline' }}>Bank Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 10px 1fr', gap: '6px', fontSize: '11px', lineHeight: '1.6' }}>
                      {profile.accHolder && <><span style={{ fontWeight: '700' }}>ACCOUNT NAME</span><span>:</span><strong>{profile.accHolder}</strong></>}
                      {profile.accountNo && <><span style={{ fontWeight: '700' }}>ACCOUNT NO</span><span>:</span><strong>{profile.accountNo}</strong></>}
                      {profile.accType && <><span style={{ fontWeight: '700' }}>ACCOUNT TYPE</span><span>:</span><strong>{profile.accType}</strong></>}
                      {profile.bankName && <><span style={{ fontWeight: '700' }}>BANK NAME</span><span>:</span><strong>{profile.bankName}</strong></>}
                      {profile.branchName && <><span style={{ fontWeight: '700' }}>BRANCH NAME</span><span>:</span><strong>{profile.branchName}</strong></>}
                      {profile.ifsc && <><span style={{ fontWeight: '700' }}>IFSC CODE</span><span>:</span><strong>{profile.ifsc}</strong></>}
                    </div>
                    {profile.bankExtra && (
                      <div style={{ marginTop: '10px', fontSize: '11px', whiteSpace: 'pre-wrap', color: '#000', borderTop: '0.5px solid #eee', paddingTop: '8px', fontWeight: '700' }}>
                        {profile.bankExtra}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Totals */}
                <div style={{ padding: '0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', fontSize: '12px' }}>
                    <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', textAlign: 'right' }}>Sub Total</div>
                    <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', textAlign: 'right', fontSize: getDynFS(ptots.sub, '12px') }}>{fmt(ptots.sub).replace('₹', '')}</div>
                    
                    {!isInterState ? (
                      <>
                        <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', textAlign: 'right' }}>CGST ({data.items[0]?.taxRate / 2}%)</div>
                        <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', textAlign: 'right', fontSize: getDynFS(ptots.taxTotal/2, '12px') }}>{fmt(ptots.taxTotal/2).replace('₹', '')}</div>
                        <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', textAlign: 'right' }}>SGST ({data.items[0]?.taxRate / 2}%)</div>
                        <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', textAlign: 'right', fontSize: getDynFS(ptots.taxTotal/2, '12px') }}>{fmt(ptots.taxTotal/2).replace('₹', '')}</div>
                      </>
                    ) : (
                      <>
                        <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', textAlign: 'right' }}>IGST ({data.items[0]?.taxRate}%)</div>
                        <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', textAlign: 'right', fontSize: getDynFS(ptots.taxTotal, '12px') }}>{fmt(ptots.taxTotal).replace('₹', '')}</div>
                      </>
                    )}

                    <div style={{ padding: '12px 15px', fontWeight: '900', fontSize: '15px', textAlign: 'right', borderBottom: '1px solid #000' }}>Total</div>
                    <div style={{ padding: '12px 15px', fontWeight: '900', fontSize: getDynFS(ptots.total, '15px'), borderLeft: '1px solid #000', textAlign: 'right', borderBottom: '1px solid #000' }}>{fmt(ptots.total).replace('₹', '')}</div>
                    
                    {type === 'Invoice' && (
                      <>
                        <div style={{ padding: '12px 15px', textAlign: 'right', fontWeight: '900' }}>Balance Due</div>
                        <div style={{ padding: '12px 15px', borderLeft: '1px solid #000', textAlign: 'right', fontWeight: '900', fontSize: getDynFS(ptots.total, '15px') }}>{fmt(ptots.total).replace('₹', '')}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', fontSize: '9px', opacity: 0.5 }}>
                This is a computer generated document.
              </div>
            </div>
          </div>
          
          {/* External Footer Props */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '10px', fontWeight: '600', color: '#666', padding: '0 5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {settings?.showBranding !== false && (
                <>POWERED BY <strong style={{ color: '#000', marginLeft: '4px' }}>{settings?.brandName || 'TechCRM'}</strong></>
              )}
            </div>
            <div>1</div>
          </div>
        </div>
      );
    }

    // Standard Template Wrapper for others
    return (
      <div style={{ fontFamily: t === 'Modern' ? 'Outfit, sans-serif' : 'sans-serif' }}>
        <style>{`
          @media print {
            body { margin: 0; padding: 0; background: #fff; }
            .a4-container { box-shadow: none !important; margin: 0 !important; border: none !important; }
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
              <div style={{ fontSize: t === 'Modern' ? 20 : 16, fontWeight: 700, marginTop: 4 }}>{data.client}</div>
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
            {(data.items || []).map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '14px 8px', fontSize: 13 }}><strong>{it.name}</strong>{it.desc && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{it.desc}</div>}</td>
                <td style={{ padding: '14px 8px', fontSize: 13, textAlign: 'center' }}>{it.qty}</td>
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
