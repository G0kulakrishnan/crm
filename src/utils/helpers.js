// Default lists for synchronization
export const DEFAULT_SOURCES = ['FB Ads', 'Direct', 'Broker', 'Google Ads', 'Referral', 'WhatsApp', 'Website', 'IndiaMART', 'JustDial', 'Other'];
export const DEFAULT_STAGES = ['New Enquiry', 'Enquiry Contacted', 'Quotation Created', 'Quotation Sent', 'Invoice Created', 'Invoice Sent', 'Budget Negotiation', 'Advance Paid', 'Won', 'Lost'];
export const DEFAULT_REQUIREMENTS = ['Hot', 'Warm', 'Cold', 'VIP', 'Pending'];
export const DEFAULT_PROD_CATS = ['Electronics', 'Home Appliances', 'Services', 'Furniture', 'General'];
export const DEFAULT_UNITS = ['Nos', 'Hours', 'Days', 'Months', 'Kgs', 'Ltrs', 'Meters', 'Other'];
export const SYSTEM_STAGES = ['Quotation Created', 'Quotation Sent', 'Invoice Created', 'Invoice Sent', 'Won'];

// Format currency in INR
export const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n || 0);

// Format date
export const fmtD = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Format date and time
export const fmtDT = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Days left
export const daysLeft = (d) => Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));

// Stage badge class
export const stageBadgeClass = (s, wonStage = 'Won') => {
  if (s === wonStage) return 'bg-green';
  const m = {
    'New Enquiry': 'bg-blue', 'Enquiry Contacted': 'bg-teal', 
    'Quotation Created': 'bg-gray', 'Quotation Sent': 'bg-purple', 
    'Invoice Created': 'bg-gray', 'Invoice Sent': 'bg-indigo',
    'Budget Negotiation': 'bg-yellow',
    'Advance Paid': 'bg-purple', 'Won': 'bg-green', 'Lost': 'bg-red',
    'In Progress': 'bg-blue', 'Planning': 'bg-teal', 'On Hold': 'bg-yellow', 'Completed': 'bg-green',
    'Paid': 'bg-green', 'Draft': 'bg-gray', 'Sent': 'bg-teal', 'Overdue': 'bg-red',
    'Active': 'bg-green', 'Expired': 'bg-red', 'Expiring Soon': 'bg-yellow',
    'Trial': 'bg-blue', 'Paused': 'bg-gray', 'Pending': 'bg-yellow',
    'Approved': 'bg-green', 'Rejected': 'bg-red', 'Success': 'bg-green', 'Failed': 'bg-red',
    'Open': 'bg-blue', 'Closed': 'bg-gray', 'Under Review': 'bg-yellow', 'Planned': 'bg-teal',
    'Cancelled': 'bg-gray', 'To Do': 'bg-gray', 'Review': 'bg-purple', 'Done': 'bg-green',
    'Created': 'bg-teal',
  };
  return m[s] || 'bg-gray';
};

export const prioBadgeClass = (p) => ({ High: 'bg-red', Medium: 'bg-yellow', Low: 'bg-green' }[p] || 'bg-gray');

// Generate a unique ID
export const uid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
};

// Generate next document number
export const nextNo = (prefix, count) => `${prefix}${new Date().getFullYear()}/${String(count).padStart(3, '0')}`;

// Tax options for line items
export const TAX_OPTIONS = [
  { label: 'None (0%)', rate: 0 },
  { label: 'GST 5%', rate: 5 },
  { label: 'GST 12%', rate: 12 },
  { label: 'GST 18%', rate: 18 },
  { label: 'GST 28%', rate: 28 },
  { label: 'IGST 5%', rate: 5 },
  { label: 'IGST 12%', rate: 12 },
  { label: 'IGST 18%', rate: 18 },
  { label: 'IGST 28%', rate: 28 },
];

// Get greeting based on time
export const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// Indian States List for GST calculation
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

// Common Countries
export const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia", 
  "United Arab Emirates", "Singapore", "Malaysia", "Saudi Arabia", "Other"
];
export const numberToWords = (num) => {
  if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const format = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + format(n % 100) : '');
    return '';
  };

  const convert = (n) => {
    let res = '';
    if (n >= 10000000) {
      res += convert(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      res += convert(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      res += convert(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n > 0) {
      res += format(n);
    }
    return res.trim();
  };

  const [integer, decimal] = String(num).split('.');
  let result = 'Indian Rupee ' + convert(parseInt(integer)) + ' Only';
  if (decimal && parseInt(decimal) > 0) {
    result = 'Indian Rupee ' + convert(parseInt(integer)) + ' and ' + convert(parseInt(decimal)) + ' Paise Only';
  }
  return result;
};

export const getInvoiceStatus = (inv) => {
  if (!inv || !inv.status) return 'Draft';
  if (['Paid', 'Draft', 'Cancelled'].includes(inv.status)) return inv.status;
  
  if (inv.dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(inv.dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) {
      return 'Overdue';
    }
  }
  return inv.status;
};
