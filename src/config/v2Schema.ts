export interface V2TabSchema {
  name: string;
  headers: string[];
  dropdowns?: Record<string, string[]>;
  idPrefix?: string;
  idHeader?: string;
}

export interface V2SheetSchema {
  key: string;
  title: string;
  envKey: string;
  defaultId: string;
  tabs: V2TabSchema[];
}

export const V2_SPREADSHEET_SCHEMAS: Record<string, V2SheetSchema> = {
  orders: {
    key: 'orders',
    title: 'GUDORIA_ORDERS',
    envKey: 'VITE_GOOGLE_SHEET_V2_ORDERS',
    defaultId: '1uUfxL_k6k4ebzHPWL4pwwtdIaxzZ-6mW4mqB_6iJnXo',
    tabs: [
      {
        name: 'Customer_Master',
        idPrefix: 'CUST',
        idHeader: 'Customer_ID',
        headers: [
          'Customer_ID', 'Business_Name', 'Contact_Person', 'Designation', 
          'Customer_Type', 'Lead_Source', 'Phone', 'WhatsApp', 'Email', 
          'Address', 'City', 'State', 'Instagram', 'Website', 'Status', 
          'Date_Added', 'Notes'
        ],
        dropdowns: {
          Customer_Type: ['Cafe', 'Hotel', 'Minibar', 'Corporate', 'Wedding Planner', 'Individual'],
          Lead_Source: ['Instagram', 'Referral', 'Exhibition', 'Website', 'BNI', 'Store A', 'Store B', 'Event', 'Sales Tracker'],
          Status: ['Active', 'Inactive', 'Prospect']
        }
      },
      {
        name: 'Orders_Log',
        idPrefix: 'ORD',
        idHeader: 'Order_ID',
        headers: [
          'Order_ID', 'Date', 'Customer_ID', 'Channel', 'Items', 'Qty', 
          'Price_Per_Unit', 'GST_Percent', 'Total_Value', 'Payment_Status', 
          'Delivery_Status', 'Delivery_Method', 'Tracking_ID', 'Invoice_Link', 'Notes'
        ],
        dropdowns: {
          Channel: ['WhatsApp', 'Instagram', 'BNI', 'Store A', 'Store B', 'Website', 'Event', 'Direct'],
          Payment_Status: ['Paid', 'Pending', 'Partial'],
          Delivery_Status: ['Pending', 'Packed', 'Shipped', 'Delivered', 'Returned'],
          Delivery_Method: ['Porter', 'Dunzo', 'BlueDart', 'Delhivery', 'Self', 'Scaria']
        }
      },
      {
        name: 'Payments_Tracker',
        idPrefix: 'PAY',
        idHeader: 'Payment_ID',
        headers: [
          'Payment_ID', 'Date', 'Order_ID', 'Customer_ID', 'Amount_Received', 
          'Balance_Due', 'Payment_Mode', 'Transaction_Reference', 'Follow_Up_Date', 'Status', 'Notes'
        ],
        dropdowns: {
          Payment_Mode: ['UPI', 'Bank Transfer', 'Cash', 'Razorpay'],
          Status: ['Cleared', 'Pending', 'Failed']
        }
      }
    ]
  },
  'supply-chain': {
    key: 'supply-chain',
    title: 'GUDORIA_SUPPLY_CHAIN',
    envKey: 'VITE_GOOGLE_SHEET_V2_VENDORS',
    defaultId: '1JDUQjgETO7xF0M2GaFsejkF3CWJGpPkz3zD9Qse9Zv8',
    tabs: [
      {
        name: 'Vendor_Master',
        idPrefix: 'VEND',
        idHeader: 'Vendor_ID',
        headers: [
          'Vendor_ID', 'Company_Name', 'Contact_Person', 'Designation', 
          'Category', 'Products_Services', 'Phone', 'WhatsApp', 'Email', 
          'Address', 'City', 'State', 'GST_Number', 'FSSAI', 'Status', 
          'Date_Added', 'Notes'
        ],
        dropdowns: {
          Category: ['Cocoa', 'Packaging', 'Printer', 'Transport', 'Testing', 'Other'],
          Status: ['Active', 'Inactive', 'Blacklisted']
        }
      },
      {
        name: 'Purchase_Orders',
        idPrefix: 'PO',
        idHeader: 'PO_ID',
        headers: [
          'PO_ID', 'Date', 'Vendor_ID', 'Item_Description', 'Qty_Ordered', 
          'Unit', 'Expected_Delivery', 'Actual_Delivery', 'Status', 'Received_By', 'Notes'
        ],
        dropdowns: {
          Status: ['Ordered', 'Received', 'Cancelled', 'Delayed']
        }
      },
      {
        name: 'Goods_Received',
        idPrefix: 'GR',
        idHeader: 'GR_ID',
        headers: [
          'GR_ID', 'Date', 'Vendor_ID', 'PO_ID', 'Item_Description', 
          'Qty_Received', 'Qty_Damaged', 'Quality_Check', 'Accepted', 'Received_By', 'Notes'
        ],
        dropdowns: {
          Quality_Check: ['Pass', 'Fail'],
          Accepted: ['Yes', 'No']
        }
      },
      {
        name: 'Live_Stock',
        idPrefix: 'STK',
        idHeader: 'SKU',
        headers: [
          'Date_Updated', 'Flavor', 'SKU', 'Weight_Grams', 'Qty_25g_Bars', 
          'Qty_8g_Pieces', 'Qty_Box_6pc', 'Qty_Box_8pc', 'Batch_ID', 'Expiry_Date', 'Location', 'Notes'
        ],
        dropdowns: {
          Flavor: ['Almond Noir', 'Peanut Royale', 'Orange Sunset', 'Sun-Kissed Lemon', 'Indian Sea Salt', 'Midnight Mocha', 'Malabar Jackfruit']
        }
      }
    ]
  },
  marketing: {
    key: 'marketing',
    title: 'GUDORIA_MARKETING',
    envKey: 'VITE_GOOGLE_SHEET_V2_MARKETING',
    defaultId: '1UI7o2XDjfea2QPDQ3kGE97p_0bIJhv5eK2XSNnrzT4M',
    tabs: [
      {
        name: 'Campaigns',
        idPrefix: 'MKT',
        idHeader: 'Campaign_ID',
        headers: [
          'Campaign_ID', 'Campaign_Name', 'Type', 'Objective', 'Start_Date', 
          'End_Date', 'Status', 'Budget', 'Actual_Spend', 'Leads_Collected', 'Sales_Generated', 'Owner', 'Notes'
        ],
        dropdowns: {
          Type: ['Instagram', 'Physical', 'Exhibition', 'Corporate', 'Website', 'WhatsApp'],
          Status: ['Planning', 'Active', 'Paused', 'Completed', 'Cancelled']
        }
      },
      {
        name: 'Content_Planner',
        idPrefix: 'CNT',
        idHeader: 'Content_ID',
        headers: [
          'Content_ID', 'Campaign_ID', 'Platform', 'Content_Type', 'Topic', 
          'Caption', 'CTA', 'Scheduled_Date', 'Posted_Date', 'Status', 'Reach', 'Engagement', 'Drive_Link', 'Notes'
        ],
        dropdowns: {
          Platform: ['Instagram', 'Facebook', 'LinkedIn', 'Website', 'WhatsApp'],
          Content_Type: ['Reel', 'Story', 'Carousel', 'Poster', 'Video', 'Blog'],
          Status: ['Draft', 'Scheduled', 'Posted']
        }
      },
      {
        name: 'Events_Log',
        idPrefix: 'EVT',
        idHeader: 'Event_ID',
        headers: [
          'Event_ID', 'Campaign_ID', 'Event_Name', 'Venue', 'Event_Date', 
          'Products_Taken', 'Samples_Distributed', 'Sales_Made', 'Leads_Collected', 'Follow_Up_Required', 'Status', 'Drive_Link', 'Notes'
        ],
        dropdowns: {
          Status: ['Planned', 'Completed', 'Cancelled'],
          Follow_Up_Required: ['Yes', 'No']
        }
      }
    ]
  },
  finance: {
    key: 'finance',
    title: 'GUDORIA_FINANCE',
    envKey: 'VITE_GOOGLE_SHEET_V2_FINANCE',
    defaultId: '1WuaX5JZLQ1IGNUBaVhK0dcqzrEbYX2fPz0qv6VBujHE',
    tabs: [
      {
        name: 'Income_Expenses',
        idPrefix: 'FIN',
        idHeader: 'Transaction_ID',
        headers: [
          'Transaction_ID', 'Date', 'Type', 'Category', 'Related_Module', 
          'Related_ID', 'Description', 'Amount', 'Payment_Mode', 'Payment_Status', 'Invoice_Link', 'Notes'
        ],
        dropdowns: {
          Type: ['Income', 'Expense'],
          Category: ['Sales', 'Raw Material', 'Packaging', 'Transport', 'Marketing', 'Legal', 'Salary', 'Rent', 'Utilities', 'Other'],
          Payment_Mode: ['Cash', 'UPI', 'Bank Transfer', 'Razorpay'],
          Payment_Status: ['Cleared', 'Pending', 'Failed']
        }
      },
      {
        name: 'Cash_Flow',
        headers: [
          'Week_Start', 'Week_End', 'Opening_Balance', 'Total_Income', 
          'Total_Expense', 'Net_Flow', 'Closing_Balance', 'Notes'
        ]
      }
    ]
  },
  legal: {
    key: 'legal',
    title: 'GUDORIA_LEGAL',
    envKey: 'VITE_GOOGLE_SHEET_V2_LEGAL',
    defaultId: '1zvRLFrAeCs5siW4UdijmF_JNSJLOS8opDirQY5lEZAI',
    tabs: [
      {
        name: 'Legal_Master',
        idPrefix: 'LEG',
        idHeader: 'Document_ID',
        headers: [
          'Document_ID', 'Document_Name', 'Category', 'Sub_Category', 
          'Current_Status', 'Person_Responsible', 'Authority', 'Issue_Date', 
          'Expiry_Date', 'Renewal_Reminder_Days', 'Priority', 'Current_Version', 'Drive_Link', 'Notes'
        ],
        dropdowns: {
          Category: ['GST', 'FSSAI', 'Trademark', 'Rental Agreement', 'Food Testing', 'Other'],
          Sub_Category: ['Registration', 'Renewal', 'Certificate', 'Agreement', 'Report'],
          Current_Status: ['Draft', 'Submitted', 'Approved', 'Pending', 'Expired'],
          Priority: ['High', 'Medium', 'Low']
        }
      },
      {
        name: 'Renewal_Tracker',
        idHeader: 'Document_ID',
        headers: [
          'Document_ID', 'Renewal_Submitted_Date', 'Renewal_Status', 
          'Expected_Approval', 'Renewal_Cost', 'Payment_Status', 'Notes'
        ],
        dropdowns: {
          Renewal_Status: ['Pending', 'Approved', 'Rejected'],
          Payment_Status: ['Paid', 'Pending']
        }
      }
    ]
  },
  tasks: {
    key: 'tasks',
    title: 'GUDORIA_TASKS',
    envKey: 'VITE_GOOGLE_SHEET_V2_TASKS',
    defaultId: '1PIw-enBWLfu_LGwWDh6u1tdfjGCPO4P-Q5t2R0Eit84',
    tabs: [
      {
        name: 'Action_Items',
        idPrefix: 'TASK',
        idHeader: 'Task_ID',
        headers: [
          'Task_ID', 'Task_Name', 'Related_Module', 'Related_ID', 'Assigned_To', 
          'Created_By', 'Created_Date', 'Due_Date', 'Completion_Date', 'Priority', 'Status', 'Notes'
        ],
        dropdowns: {
          Related_Module: ['Orders', 'Supply Chain', 'Marketing', 'Finance', 'Legal'],
          Priority: ['High', 'Medium', 'Low'],
          Status: ['Not Started', 'In Progress', 'Waiting', 'Completed', 'Cancelled']
        }
      },
      {
        name: 'Decision_Register',
        idPrefix: 'DEC',
        idHeader: 'Decision_ID',
        headers: [
          'Decision_ID', 'Decision', 'Date', 'Reason', 'Owner', 'Related_Module', 
          'Status', 'Implementation_Date', 'Result', 'Notes'
        ],
        dropdowns: {
          Related_Module: ['Orders', 'Supply Chain', 'Marketing', 'Finance', 'Legal'],
          Status: ['Pending', 'Implemented'],
          Result: ['Successful', 'Failed', 'Ongoing']
        }
      }
    ]
  }
};
