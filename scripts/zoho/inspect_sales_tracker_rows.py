import zipfile
import xml.etree.ElementTree as ET

def inspect_sales_tracker_rows():
    file_path = "c:/Users/user/Desktop/gud/zoho/Copy of Stock & Sales Tracker (1).xlsx"
    shared_strings = []
    with zipfile.ZipFile(file_path, 'r') as zip_ref:
        try:
            with zip_ref.open('xl/sharedStrings.xml') as f:
                tree = ET.parse(f)
                root = tree.getroot()
                for elem in root.iter():
                    if elem.tag.endswith('t'):
                        shared_strings.append(elem.text)
        except Exception:
            pass

        sheets = []
        with zip_ref.open('xl/workbook.xml') as f:
            tree = ET.parse(f)
            root = tree.getroot()
            for elem in root.iter():
                if elem.tag.endswith('sheet'):
                    sheets.append(elem.attrib.get('name'))
        
        idx = sheets.index('Sales Tracker ')
        sheet_file = f'xl/worksheets/sheet{idx+1}.xml'
        
        with zip_ref.open(sheet_file) as f:
            tree = ET.parse(f)
            root = tree.getroot()
            
            for r_elem in root.iter():
                if r_elem.tag.endswith('row'):
                    r_idx = int(r_elem.attrib.get('r', 0))
                    if 1 < r_idx <= 15:
                        row_vals = {}
                        for c_elem in r_elem.iter():
                            if c_elem.tag.endswith('c'):
                                cell_ref = c_elem.attrib.get('r')
                                col_idx = 0
                                for char in ''.join([char for char in cell_ref if char.isalpha()]):
                                    col_idx = col_idx * 26 + (ord(char) - ord('A') + 1)
                                col_idx -= 1
                                val_elem = c_elem.find('{*}v')
                                val = val_elem.text if val_elem is not None else None
                                if c_elem.attrib.get('t') == 's' and val is not None:
                                    val = shared_strings[int(val)]
                                row_vals[col_idx] = val
                        
                        c_num = row_vals.get(2, '')
                        c_name = row_vals.get(3, '')
                        cust_name = row_vals.get(5, '')
                        phone = row_vals.get(6, '')
                        email = row_vals.get(7, '')
                        address = row_vals.get(9, '')
                        
                        clean_c_name = str(c_name).encode('ascii', 'ignore').decode('ascii')
                        clean_cust_name = str(cust_name).encode('ascii', 'ignore').decode('ascii')
                        clean_phone = str(phone).encode('ascii', 'ignore').decode('ascii')
                        clean_email = str(email).encode('ascii', 'ignore').decode('ascii')
                        clean_address = str(address).encode('ascii', 'ignore').decode('ascii')
                        
                        print(f"Row {r_idx:2d} | Client: {clean_c_name:20s} | Cust: {clean_cust_name:20s} | Phone: {clean_phone:15s} | Email: {clean_email:15s} | Addr: {clean_address}")

inspect_sales_tracker_rows()
