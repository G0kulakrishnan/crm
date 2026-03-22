import React from 'react';
import db from '../../instant';
import { fmtD } from '../../utils/helpers';

export default function StockLog({ productId, ownerId, productName }) {
  const { data, isLoading } = db.useQuery({
    activityLogs: {
      $: {
        where: {
          entityId: productId,
          entityType: 'product'
        }
      }
    }
  });

  const logs = (data?.activityLogs || []).sort((a, b) => b.createdAt - a.createdAt);

  if (isLoading) return <div style={{ padding: 20, fontSize: 12, color: 'var(--muted)' }}>Loading history...</div>;

  return (
    <div className="stock-log">
      <div style={{ padding: '10px 15px', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: 13 }}>Stock Movement History: {productName}</h4>
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#fff', z : 1, boxShadow: '0 1px 0 var(--border)' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 15px' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '10px 15px' }}>Activity</th>
              <th style={{ textAlign: 'left', padding: '10px 15px' }}>User</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No movements recorded yet.</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--bg-soft)' }}>
                <td style={{ padding: '10px 15px', whiteSpace: 'nowrap' }}>{fmtD(log.createdAt)}</td>
                <td style={{ padding: '10px 15px' }}>{log.text}</td>
                <td style={{ padding: '10px 15px', color: 'var(--muted)' }}>{log.userName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
