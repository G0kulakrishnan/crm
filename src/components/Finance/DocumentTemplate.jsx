import React from 'react';
import { fmt, fmtD, numberToWords } from '../../utils/helpers';

export default function DocumentTemplate({ data, profile, type = 'Invoice', preview = false }) {
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
    // ... (logic remains same inside renderContent)
    if (t === 'Spreadsheet') {
      return (
        <div className="spreadsheet-template" style={{ fontSize: '11px', lineHeight: '1.4' }}>
          <style>{`
            @media print {
              body { margin: 0; padding: 0; background: #fff; }
              .a4-container { box-shadow: none !important; margin: 0 !important; border: none !important; }
              .no-print { display: none !important; }
            }
          `}</style>
          
          <div style={{ border: '1px solid #000', padding: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                {profile.logo && <img src={profile.logo} alt="Logo" style={{ height: '70px', width: '70px', objectFit: 'contain' }} />}
                <div>
                  <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '800', textTransform: 'uppercase' }}>{profile.bizName}</h2>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '10px' }}>{profile.address}</div>
                  {profile.gstin && <div style={{ fontWeight: '700', marginTop: '4px' }}>GSTIN: {profile.gstin}</div>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '900', letterSpacing: '1px' }}>TAX INVOICE</h1>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 1.5fr', border: '1px solid #000', borderBottom: 'none' }}>
              <div style={{ borderRight: '1px solid #000', padding: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '90px 10px 1fr', gap: '2px', fontSize: '10px' }}>
                  <span style={{ fontWeight: '700' }}>#</span><span>:</span><strong>{data.no}</strong>
                  <span style={{ fontWeight: '700' }}>Invoice Date</span><span>:</span>{fmtD(data.date)}
                  <span style={{ fontWeight: '700' }}>Terms</span><span>:</span>{data.terms || 'Due on Receipt'}
                  <span style={{ fontWeight: '700' }}>Due Date</span><span>:</span>{fmtD(data.dueDate)}
                </div>
              </div>
              <div style={{ padding: '6px' }}></div>
            </div>

            <div style={{ border: '1px solid #000', backgroundColor: '#f3f4f6', padding: '4px 8px', fontWeight: '700', fontSize: '9px', textTransform: 'uppercase' }}>Bill To</div>
            <div style={{ border: '1px solid #000', borderTop: 'none', padding: '8px', marginBottom: '0' }}>
              <div style={{ fontWeight: '800', fontSize: '12px', textTransform: 'uppercase' }}>{data.client}</div>
              {clientMatch.gstin && <div style={{ fontWeight: '700', marginTop: '2px' }}>GSTIN: {clientMatch.gstin}</div>}
              {clientMatch.address && <div style={{ marginTop: '4px', opacity: '0.9', fontSize: '10px' }}>{clientMatch.address}</div>}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '-1px' }}>
              <thead>
                <tr style={{ textAlign: 'center', backgroundColor: '#f3f4f6', fontSize: '10px' }}>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '30px' }}>#</th>
                  <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'left' }}>Item & Description</th>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '50px' }}>Qty</th>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '80px', textAlign: 'right' }}>Rate</th>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '120px' }} colSpan="2">CGST</th>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '120px' }} colSpan="2">SGST</th>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '90px', textAlign: 'right' }}>Amount</th>
                </tr>
                <tr style={{ textAlign: 'center', backgroundColor: '#f3f4f6', fontSize: '9px' }}>
                  <th style={{ border: '1px solid #000', borderTop: 'none' }} colSpan="4"></th>
                  <th style={{ border: '1px solid #000', padding: '2px' }}>%</th>
                  <th style={{ border: '1px solid #000', padding: '2px' }}>Amt</th>
                  <th style={{ border: '1px solid #000', padding: '2px' }}>%</th>
                  <th style={{ border: '1px solid #000', padding: '2px' }}>Amt</th>
                  <th style={{ border: '1px solid #000', borderTop: 'none' }}></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, i) => {
                  const itemTotal = (it.qty || 0) * (it.rate || 0);
                  const taxRate = it.taxRate || 0;
                  const taxAmt = itemTotal * taxRate / 100;
                  return (
                    <tr key={i} style={{ minHeight: '40px' }}>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ border: '1px solid #000', padding: '6px' }}>
                        <div style={{ fontWeight: '700' }}>{it.name}</div>
                        {it.desc && <div style={{ fontSize: '9px', color: '#444', whiteSpace: 'pre-wrap', marginTop: '2px' }}>{it.desc}</div>}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{it.qty.toFixed(2)}</td>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{fmt(it.rate).replace('₹', '')}</td>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{isInterState ? 0 : (taxRate / 2)}%</td>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{isInterState ? '-' : fmt(taxAmt / 2).replace('₹', '')}</td>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{isInterState ? 0 : (taxRate / 2)}%</td>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{isInterState ? '-' : fmt(taxAmt / 2).replace('₹', '')}</td>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: '700' }}>{fmt(itemTotal).replace('₹', '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', marginTop: '-1px' }}>
              <div style={{ border: '1px solid #000', padding: '8px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: '700', fontSize: '9px', color: '#666', textTransform: 'uppercase' }}>Total In Words</div>
                  <div style={{ fontWeight: '700', fontStyle: 'italic', fontSize: '10px' }}>{numberToWords(ptots.total)}</div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: '700', fontSize: '9px', color: '#666', textTransform: 'uppercase' }}>Notes</div>
                  <div style={{ opacity: '0.8', fontSize: '10px' }}>{data.notes || 'Thanks for choosing us. Looking forward for your business.'}</div>
                </div>
                <div style={{ marginTop: '10px' }}>
                   <div style={{ fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', fontSize: '9px' }}>Bank Details</div>
                   <div style={{ display: 'grid', gridTemplateColumns: '110px 10px 1fr', gap: '2px', fontSize: '10px' }}>
                     <span>ACCOUNT NAME</span><span>:</span><strong>{profile.accHolder || profile.bizName}</strong>
                     <span>ACCOUNT NO</span><span>:</span><strong>{profile.accountNo}</strong>
                     <span>BANK NAME</span><span>:</span><strong>{profile.bankName}</strong>
                     <span>IFSC CODE</span><span>:</span><strong>{profile.ifsc}</strong>
                   </div>
                </div>
              </div>
              <div style={{ border: '1px solid #000', borderLeft: 'none', padding: '0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', fontSize: '11px' }}>
                   <div style={{ padding: '6px 10px', borderBottom: '1px solid #000', textAlign: 'right' }}>Sub Total</div>
                   <div style={{ padding: '6px 10px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', textAlign: 'right' }}>{fmt(ptots.sub).replace('₹', '')}</div>
                   
                   {ptots.discAmt > 0 && (
                     <>
                       <div style={{ padding: '6px 10px', borderBottom: '1px solid #000', textAlign: 'right' }}>Discount {data.discType === '%' ? `(${data.disc}%)` : ''}</div>
                       <div style={{ padding: '6px 10px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', textAlign: 'right' }}>(-) {fmt(ptots.discAmt).replace('₹', '')}</div>
                     </>
                   )}

                   {!isInterState ? (
                     <>
                       <div style={{ padding: '6px 10px', borderBottom: '1px solid #000', textAlign: 'right' }}>CGST</div>
                       <div style={{ padding: '6px 10px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', textAlign: 'right' }}>{fmt(ptots.taxTotal/2).replace('₹', '')}</div>
                       <div style={{ padding: '6px 10px', borderBottom: '1px solid #000', textAlign: 'right' }}>SGST</div>
                       <div style={{ padding: '6px 10px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', textAlign: 'right' }}>{fmt(ptots.taxTotal/2).replace('₹', '')}</div>
                     </>
                   ) : (
                     <>
                       <div style={{ padding: '6px 10px', borderBottom: '1px solid #000', textAlign: 'right' }}>IGST</div>
                       <div style={{ padding: '6px 10px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', textAlign: 'right' }}>{fmt(ptots.taxTotal).replace('₹', '')}</div>
                     </>
                   )}

                   <div style={{ padding: '8px 10px', fontWeight: '900', fontSize: '13px', textAlign: 'right', backgroundColor: '#f9fafb' }}>Total</div>
                   <div style={{ padding: '8px 10px', fontWeight: '900', fontSize: '13px', borderLeft: '1px solid #000', textAlign: 'right', backgroundColor: '#f9fafb' }}>{fmt(ptots.total)}</div>
                   
                   <div style={{ padding: '6px 10px', borderTop: '2px solid #000', textAlign: 'right' }}>Balance Due</div>
                   <div style={{ padding: '6px 10px', borderTop: '2px solid #000', borderLeft: '1px solid #000', textAlign: 'right', fontWeight: '900' }}>{fmt(ptots.total)}</div>
                </div>
                <div style={{ padding: '20px 10px 10px 10px', textAlign: 'center', fontSize: '8px', opacity: 0.5 }}>
                   This is a computer generated document.
                </div>
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
            body { margin: 0; padding: 0; background: #fff; }
            .a4-container { box-shadow: none !important; margin: 0 !important; border: none !important; }
            .no-print { display: none !important; }
          }
        `}</style>
        {/* Header Section */}
        {t === 'Modern' ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 50, background: 'var(--accent)', color: '#fff', padding: 30, borderRadius: 12 }}>
             <div><h1 style={{ margin: 0, fontSize: 42, letterSpacing: -1 }}>{type.toUpperCase()}</h1><div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>No: {data.no} | {fmtD(data.date)}</div></div>
             <div style={{ textAlign: 'right' }}>
               <h2 style={{ margin: 0 }}>{profile.bizName}</h2>
               <div style={{ fontSize: 12, opacity: 0.9 }}>{profile.email} | {profile.phone}</div>
             </div>
          </div>
        ) : t === 'Minimal' ? (
        <div style={{ marginBottom: 60 }}>
           <h1 style={{ fontSize: 24, fontWeight: 300, margin: '0 0 10px 0' }}>{type} <span>#{data.no}</span></h1>
           <div style={{ fontSize: 12, color: '#999' }}>Issued on {fmtD(data.date)}</div>
        </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              {profile.logo && <img src={profile.logo} alt="Logo" style={{ height: 70, width: 70, objectFit: 'contain' }} />}
              <div>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>{type.toUpperCase()}</h1>
                <div style={{ fontSize: 13, color: '#666', marginTop: 5 }}>No: <strong>{data.no}</strong></div>
                <div style={{ fontSize: 13, color: '#666' }}>Date: {fmtD(data.date)}</div>
                {data.dueDate && <div style={{ fontSize: 13, color: '#666' }}>Due Date: {fmtD(data.dueDate)}</div>}
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
