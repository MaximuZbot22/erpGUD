import zipfile
import xml.etree.ElementTree as ET

def print_headers():
    file_path = "c:/Users/user/Desktop/gud/zoho/Copy of Stock & Sales Tracker.xlsx"
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
        
        gudoria_idx = sheets.index('Gudoria Sales Tracker')
        sheet_file = f'xl/worksheets/sheet{gudoria_idx+1}.xml'
        
        with zip_ref.open(sheet_file) as f:
            tree = ET.parse(f)
            root = tree.getroot()
            
            row_headers = {}
            for r_elem in root.iter():
                if r_elem.tag.endswith('row'):
                    r_idx = int(r_elem.attrib.get('r', 0))
                    if r_idx == 1:
                        for c_elem in r_elem.iter():
                            if c_elem.tag.endswith('c'):
                                cell_ref = c_elem.attrib.get('r')
                                col_letter = ''.join([char for char in cell_ref if char.isalpha()])
                                col_idx = 0
                                for char in col_letter:
                                    col_idx = col_idx * 26 + (ord(char) - ord('A') + 1)
                                col_idx -= 1
                                val_elem = c_elem.find('{*}v')
                                val = val_elem.text if val_elem is not None else None
                                t_attr = c_elem.attrib.get('t')
                                if t_attr == 's' and val is not None:
                                    str_idx = int(val)
                                    if str_idx < len(shared_strings):
                                        val = shared_strings[str_idx]
                                row_headers[col_idx] = val
                        break
            
            for col_idx in sorted(row_headers.keys()):
                col_letter = ""
                temp = col_idx + 1
                while temp > 0:
                    temp, remainder = divmod(temp - 1, 26)
                    col_letter = chr(remainder + ord('A')) + col_letter
                print(f"Col {col_letter} (Index {col_idx:2d}): {repr(row_headers[col_idx])}")

print_headers()
