import zipfile
import xml.etree.ElementTree as ET

def inspect_all_tabs():
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
        
        for idx, sheet_name in enumerate(sheets):
            sheet_file = f'xl/worksheets/sheet{idx+1}.xml'
            try:
                with zip_ref.open(sheet_file) as f:
                    tree = ET.parse(f)
                    root = tree.getroot()
                    
                    row1_vals = []
                    for r_elem in root.iter():
                        if r_elem.tag.endswith('row'):
                            r_idx = int(r_elem.attrib.get('r', 0))
                            if r_idx == 1:
                                for c_elem in r_elem.iter():
                                    if c_elem.tag.endswith('c'):
                                        val_elem = c_elem.find('{*}v')
                                        val = val_elem.text if val_elem is not None else None
                                        if c_elem.attrib.get('t') == 's' and val is not None:
                                            val = shared_strings[int(val)]
                                        if val:
                                            row1_vals.append(val.strip().lower())
                                break
                    print(f"Sheet: {sheet_name} | Headers: {row1_vals[:10]}")
            except Exception as e:
                pass

inspect_all_tabs()
