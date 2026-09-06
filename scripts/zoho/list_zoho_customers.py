import requests

def get_oauth_data():
    refresh_token = '1000.edc26a2423e747273b9c7588b59a1b59.c8270ac98ff1319c3c30adec0241c655'
    client_id = '1000.RPU3EEI4IWS1272MLOG2X3UAFJYT3O'
    client_secret = '7d6f814382edbc4a347f578b4d98327193ea18e122'
    
    url = 'https://accounts.zoho.in/oauth/v2/token'
    payload = {
        'grant_type': 'refresh_token',
        'client_id': client_id,
        'client_secret': client_secret,
        'refresh_token': refresh_token
    }
    
    res = requests.post(url, data=payload)
    token = res.json()['access_token']
    
    org_res = requests.get('https://www.zohoapis.in/books/v3/organizations', headers={'Authorization': 'Zoho-oauthtoken ' + token})
    org_id = org_res.json()['organizations'][0]['organization_id']
    
    return token, org_id

def list_customers():
    token, org_id = get_oauth_data()
    headers = {'Authorization': 'Zoho-oauthtoken ' + token}
    params = {'organization_id': org_id}
    
    res = requests.get('https://www.zohoapis.in/books/v3/contacts', headers=headers, params=params)
    contacts = res.json().get('contacts', [])
    print("ZOHO BOOKS CUSTOMERS:")
    for contact in contacts:
        print(f"  Name: {repr(contact['contact_name'])} | ID: {contact['contact_id']} | Email: {repr(contact.get('email'))} | Phone: {repr(contact.get('phone'))}")

list_customers()
