import React, { useState } from 'react';

const SECTIONS = [
  {
    id: 'intro',
    title: '🚀 Getting Started',
    content: `Welcome to T2GCRM! This manual will help you master every module to grow your business efficiency.`,
    example: 'Tip: Start by completing your "Business Settings" to set your logo and currency.'
  },
  {
    id: 'crm',
    title: '👥 Leads & CRM',
    content: `The heart of your sales process. Use this to track everyone from a first-time inquiry to a repeating customer.
    - **Leads**: Capture potential customers. Use "Stages" (New, Follow-up, Qualified) to track progress.
    - **Customers**: Once a lead is "Won", they become a customer. You can see their full purchase history here.
    - **Notes**: Never forget a detail. Add notes after every call or meeting.`,
    example: 'Example: You receive a call from "John Doe". Add him as a Lead. Move him to "Follow up" after the call. Add a note: "Interested in premium plan, call back Tuesday."'
  },
  {
    id: 'finance',
    title: '💰 Finance & Billing',
    content: `Manage your money with professional documents.
    - **Quotations**: Send estimates to clients.
    - **Invoices**: Bill your customers.
    - **POS Billing**: Use the "Point of Sale" interface for quick, in-person sales (like a retail shop).
    - **Tracking**: See at a glance what is Paid, Partial, or Overdue.`,
    example: 'Example: For a new service inquiry, create a "Quotation". Once approved, click "Convert to Invoice" to send the final bill.'
  },
  {
    id: 'appointments',
    title: '📅 Appointments',
    content: `Let your clients book you online 24/7.
    - **Booking Link**: Share your public URL in your WhatsApp bio or website.
    - **Availability**: Set your working hours and holidays.
    - **Management**: View your "Today" count and "Overdue" pending bookings.`,
    example: 'Example: Share your link (e.g., crm.t2gcrm.in/your-slug/book). A client picks Monday 10:00 AM. You instantly see it in your dashboard.'
  },
  {
    id: 'ecommerce',
    title: '🛒 E-commerce Store',
    content: `Sell products directly online.
    - **Products**: Upload images, descriptions, and set prices.
    - **Storefront**: Your automatic "Mini-Website" where customers can browse.
    - **Orders**: Manage incoming orders, check payments, and update tracking details.`,
    example: 'Example: customer visits your store, adds 3 items to cart, and checks out. You receive an "Order" notification and the stock is automatically managed.'
  },
  {
    id: 'automations',
    title: '🤖 Automations',
    content: `Let the CRM work for you while you sleep.
    - **Email Rules**: Set rules to send "Welcome" or "Follow-up" emails based on Lead Stages.
    - **Triggers**: When a lead hits "Interested", the CRM can automatically send your price list.`,
    example: 'Example: Set a rule: "If Lead Stage = Done, send Feedback Email after 1 day." The CRM handles the rest.'
  },
  {
    id: 'system',
    title: '⚙️ System & Integrations',
    content: `Connect and customize.
    - **Google Sheets**: Sync your leads from any spreadsheet directly into the CRM.
    - **Branding**: Set your own logo, brand colors, and domain.
    - **Team**: Add staff members with limited permissions (e.g., Sales only see Leads).`,
    example: 'Example: Connect your Facebook Lead Form to a Google Sheet, and watch leads pop up in the CRM instantly.'
  }
];

export default function UserManual({ isPublic = false, settings }) {
  const [active, setActive] = useState('intro');

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: isPublic ? '100vh' : 'auto', 
      background: '#f8fafc',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)'
    }}>
      {/* Header */}
      <header style={{ 
        padding: '20px 40px', 
        background: '#fff', 
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {settings?.brandLogo ? (
            <img src={settings.brandLogo} alt="Logo" style={{ height: 32 }} />
          ) : (
            <div style={{ background: 'var(--accent)', color: '#fff', padding: '6px 12px', borderRadius: 8, fontWeight: 800 }}>{settings?.brandShort || 'T2G'}</div>
          )}
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>User Manual & Documentation</h1>
        </div>
        {isPublic && (
          <a href="/" style={{ textDecoration: 'none', color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>Sign In to CRM →</a>
        )}
      </header>

      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 73px)' }}>
        {/* Sidebar Nav */}
        <aside style={{ 
          width: 280, 
          background: '#fff', 
          borderRight: '1px solid #e2e8f0', 
          padding: '30px 20px',
          overflowY: 'auto'
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 20, paddingLeft: 10 }}>Table of Contents</div>
          {SECTIONS.map(s => (
            <div 
              key={s.id} 
              onClick={() => {
                setActive(s.id);
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{ 
                padding: '12px 16px', 
                borderRadius: 10, 
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: active === s.id ? 700 : 500,
                background: active === s.id ? '#f0f9ff' : 'transparent',
                color: active === s.id ? '#0369a1' : '#475569',
                marginBottom: 4,
                transition: 'all 0.2s'
              }}
            >
              {s.title}
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '40px 60px', overflowY: 'auto', background: '#fff' }}>
          <div style={{ maxWidth: 800 }}>
            {SECTIONS.map(s => (
              <section key={s.id} id={s.id} style={{ marginBottom: 60, borderBottom: '1px solid #f1f5f9', paddingBottom: 60 }}>
                <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>{s.title}</h2>
                <div style={{ 
                  fontSize: 16, 
                  lineHeight: 1.7, 
                  color: '#334155', 
                  whiteSpace: 'pre-line',
                  marginBottom: 24 
                }}>
                  {s.content}
                </div>
                
                <div style={{ 
                  background: '#f8fafc', 
                  border: '1.5px dashed #cbd5e1', 
                  padding: 24, 
                  borderRadius: 16,
                  position: 'relative'
                }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: -12, 
                    left: 20, 
                    background: '#0f172a', 
                    color: '#fff', 
                    fontSize: 11, 
                    fontWeight: 800, 
                    padding: '4px 10px', 
                    borderRadius: 6 
                  }}>PRACTICAL EXAMPLE</div>
                  <div style={{ fontSize: 15, fontStyle: 'italic', color: '#475569' }}>
                    {s.example}
                  </div>
                </div>
              </section>
            ))}

            <footer style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>
              &copy; {new Date().getFullYear()} {settings?.brandName || 'T2GCRM'}. All rights reserved documentation.
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
