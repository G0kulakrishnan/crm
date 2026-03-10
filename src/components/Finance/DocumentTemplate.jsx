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
    if (t === 'Spreadsheet') {
      return (
        <div className="spreadsheet-template" style={{ fontSize: '11px', lineHeight: '1.4', fontFamily: 'sans-serif' }}>
          <style>{`
            @media print {
              body { margin: 0; padding: 0; background: #fff; }
              .a4-container { box-shadow: none !important; margin: 0 !important; border: none !important; padding: 0 !important; }
              .no-print { display: none !important; }
            }
            .spreadsheet-template table td, .spreadsheet-template table th {
              border: 1px solid #000;
              padding: 6px 8px;
            }
          `}</style>
          
          <div style={{ border: '2px solid #000', padding: '20px', minHeight: '275mm', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            {/* Top Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                {profile.logo && <img src={profile.logo} alt="Logo" style={{ height: '90px', width: '90px', objectFit: 'contain' }} />}
                <div>
                  <h1 style={{ margin: '0', fontSize: '22px', fontWeight: '900', textTransform: 'uppercase' }}>{profile.bizName}</h1>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '11px', marginTop: '6px', maxWidth: '350px', fontWeight: '500' }}>{profile.address}</div>
                  {profile.gstin && <div style={{ fontWeight: '700', marginTop: '6px' }}>GSTIN: {profile.gstin}</div>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h1 style={{ margin: '0', fontSize: '32px', fontWeight: '500', letterSpacing: '0.5px' }}>TAX INVOICE</h1>
              </div>
            </div>

            {/* Info Box */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', border: '1px solid #000', borderBottom: 'none' }}>
              <div style={{ borderRight: '1px solid #000', padding: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 10px 1fr', gap: '4px', fontSize: '11px' }}>
                  <span style={{ fontWeight: '700' }}>#</span><span>:</span><strong>{data.no}</strong>
                  <span style={{ fontWeight: '700' }}>Invoice Date</span><span>:</span>{fmtD(data.date)}
                  <span style={{ fontWeight: '700' }}>Terms</span><span>:</span>{data.terms || 'Due on Receipt'}
                  <span style={{ fontWeight: '700' }}>Due Date</span><span>:</span>{fmtD(data.dueDate) || '-'}
                </div>
              </div>
              <div style={{ padding: '10px' }}></div>
            </div>

            {/* Bill To */}
            <div style={{ border: '1px solid #000', backgroundColor: '#f9fafb', padding: '5px 10px', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' }}>Bill To</div>
            <div style={{ border: '1px solid #000', borderTop: 'none', padding: '12px 10px', marginBottom: '15px' }}>
              <div style={{ fontWeight: '900', fontSize: '14px', textTransform: 'uppercase' }}>{data.client}</div>
              {clientMatch.gstin && <div style={{ fontWeight: '700', marginTop: '5px' }}>GSTIN: {clientMatch.gstin}</div>}
              {clientMatch.address && <div style={{ marginTop: '8px', opacity: '0.9', fontSize: '11px', whiteSpace: 'pre-wrap' }}>{clientMatch.address}</div>}
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
              <thead>
                <tr style={{ textAlign: 'center', backgroundColor: '#f9fafb', fontSize: '11px' }}>
                  <th style={{ width: '40px' }} rowSpan="2">#</th>
                  <th style={{ textAlign: 'left' }} rowSpan="2">ITEM & DESCRIPTION</th>
                  <th style={{ width: '60px' }} rowSpan="2">QTY</th>
                  <th style={{ width: '90px', textAlign: 'right' }} rowSpan="2">RATE</th>
                  <th style={{ width: '120px' }} colSpan="2">CGST</th>
                  <th style={{ width: '120px' }} colSpan="2">SGST</th>
                  <th style={{ width: '100px', textAlign: 'right' }} rowSpan="2">AMOUNT</th>
                </tr>
                <tr style={{ textAlign: 'center', backgroundColor: '#f9fafb', fontSize: '10px' }}>
                  <th style={{ padding: '4px' }}>%</th>
                  <th style={{ padding: '4px' }}>AMT</th>
                  <th style={{ padding: '4px' }}>%</th>
                  <th style={{ padding: '4px' }}>AMT</th>
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
                      <td>
                        <div style={{ fontWeight: '700' }}>{it.name}</div>
                        {it.desc && <div style={{ fontSize: '10px', color: '#444', whiteSpace: 'pre-wrap', marginTop: '4px' }}>{it.desc}</div>}
                      </td>
                      <td style={{ textAlign: 'center' }}>{it.qty.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(it.rate).replace('₹', '')}</td>
                      <td style={{ textAlign: 'center' }}>{isInterState ? 0 : (taxRate / 2)}%</td>
                      <td style={{ textAlign: 'right' }}>{isInterState ? '-' : fmt(taxAmt / 2).replace('₹', '')}</td>
                      <td style={{ textAlign: 'center' }}>{isInterState ? 0 : (taxRate / 2)}%</td>
                      <td style={{ textAlign: 'right' }}>{isInterState ? '-' : fmt(taxAmt / 2).replace('₹', '')}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700' }}>{fmt(itemTotal).replace('₹', '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Spacer */}
            <div style={{ flex: 1 }}></div>

            {/* Footer Box */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', border: '1px solid #000', marginTop: '20px' }}>
              <div style={{ borderRight: '1px solid #000', padding: '15px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontWeight: '500', fontSize: '11px', color: '#333', marginBottom: '4px' }}>Total In Words</div>
                  <div style={{ fontWeight: '800', fontStyle: 'italic', fontSize: '11px' }}>{numberToWords(ptots.total)}</div>
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontWeight: '500', fontSize: '11px', color: '#333', marginBottom: '4px' }}>Notes</div>
                  <div style={{ opacity: '0.9', fontSize: '10px' }}>{data.notes || `Thanks for choosing ${profile.bizName}. Looking forward for your business.`}</div>
                </div>

                <div style={{ marginTop: '10px' }}>
                   <div style={{ fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', fontSize: '11px', textDecoration: 'underline' }}>Bank Details</div>
                   <div style={{ display: 'grid', gridTemplateColumns: '130px 10px 1fr', gap: '6px', fontSize: '11px', lineHeight: '1.6' }}>
                     <span style={{ fontWeight: '700' }}>ACCOUNT NAME</span><span>:</span><strong>{profile.accHolder || profile.bizName}</strong>
                     <span style={{ fontWeight: '700' }}>ACCOUNT NO</span><span>:</span><strong>{profile.accountNo}</strong>
                     <span style={{ fontWeight: '700' }}>CURRENT ACCOUNT</span><span>:</span><strong>{profile.accType || 'CURRENT ACCOUNT'}</strong>
                     {profile.bankName && <><span style={{ fontWeight: '700' }}>BANK NAME</span><span>:</span><strong>{profile.bankName}</strong></>}
                     {profile.branchName && <><span style={{ fontWeight: '700' }}>BRANCH NAME</span><span>:</span><strong>{profile.branchName}</strong></>}
                     {profile.ifsc && <><span style={{ fontWeight: '700' }}>IFSC CODE</span><span>:</span><strong>{profile.ifsc}</strong></>}
                   </div>
                </div>
              </div>
              
              <div style={{ padding: '0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', fontSize: '12px' }}>
                   <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', textAlign: 'right' }}>Sub Total</div>
                   <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', textAlign: 'right' }}>{fmt(ptots.sub).replace('₹', '')}</div>
                   
                   {!isInterState ? (
                     <>
                       <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', textAlign: 'right' }}>CGST ({data.items[0]?.taxRate / 2}%)</div>
                       <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', textAlign: 'right' }}>{fmt(ptots.taxTotal/2).replace('₹', '')}</div>
                       <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', textAlign: 'right' }}>SGST ({data.items[0]?.taxRate / 2}%)</div>
                       <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', textAlign: 'right' }}>{fmt(ptots.taxTotal/2).replace('₹', '')}</div>
                     </>
                   ) : (
                     <>
                       <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', textAlign: 'right' }}>IGST ({data.items[0]?.taxRate}%)</div>
                       <div style={{ padding: '10px 15px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', textAlign: 'right' }}>{fmt(ptots.taxTotal).replace('₹', '')}</div>
                     </>
                   )}

                   <div style={{ padding: '12px 15px', fontWeight: '900', fontSize: '15px', textAlign: 'right', borderBottom: '1px solid #000' }}>Total</div>
                   <div style={{ padding: '12px 15px', fontWeight: '900', fontSize: '15px', borderLeft: '1px solid #000', textAlign: 'right', borderBottom: '1px solid #000' }}>{fmt(ptots.total)}</div>
                   
                   <div style={{ padding: '12px 15px', textAlign: 'right', fontWeight: '900' }}>Balance Due</div>
                   <div style={{ padding: '12px 15px', borderLeft: '1px solid #000', textAlign: 'right', fontWeight: '900', fontSize: '15px' }}>{fmt(ptots.total)}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', fontSize: '8px', opacity: 0.5 }}>
              This is a computer generated document.
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '10px', fontWeight: '600', color: '#666', padding: '0 5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              POWERED BY <img src="https://instantdb.com/favicon.ico" style={{ height: '12px' }} alt="logo" />
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
