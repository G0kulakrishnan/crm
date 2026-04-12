class ApiConfig {
  static const String baseUrl = 'https://crm.t2gcrm.in';
  static const String authEndpoint = '$baseUrl/api/auth';
  static const String dataEndpoint = '$baseUrl/api/data';
  static const String callLogsEndpoint = '$baseUrl/api/call-logs';

  static const List<String> defaultSources = [
    'FB Ads', 'Direct', 'Broker', 'Google Ads',
    'Referral', 'WhatsApp', 'Website', 'Other'
  ];

  static const List<String> defaultStages = [
    'New Enquiry', 'Enquiry Contacted', 'Quotation Created',
    'Quotation Sent', 'Invoice Created', 'Invoice Sent',
    'Budget Negotiation', 'Advance Paid', 'Won', 'Lost'
  ];

  static const List<String> defaultRequirements = [
    'Hot', 'Warm', 'Cold', 'VIP', 'Pending'
  ];

  static const List<String> defaultProductCats = [
    'Electronics', 'Home Appliances', 'Services', 'Furniture', 'General'
  ];
}
