import urllib.request
import urllib.error
import json

def test_api():
    print("Testing Department endpoints via running server...")
    base_url = "http://localhost:8000"
    
    # 1. Login to get token in cookies
    login_url = f"{base_url}/api/auth/login"
    login_data = json.dumps({
        "email": "admin@callaudit.com",
        "password": "AdminPassword123"
    }).encode("utf-8")
    
    req = urllib.request.Request(
        login_url,
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    
    cookies = []
    try:
        with urllib.request.urlopen(req) as response:
            # Read profile response to verify login
            profile = json.loads(response.read().decode("utf-8"))
            print(f"Successfully logged in as {profile['firstName']} {profile['lastName']}!")
            
            # Extract Set-Cookie headers
            info = response.info()
            for header, value in info.items():
                if header.lower() == 'set-cookie':
                    cookie_part = value.split(';')[0]
                    cookies.append(cookie_part)
            
            cookie_header = "; ".join(cookies)
            print(f"Extracted Cookie Header: {cookie_header}")
    except urllib.error.HTTPError as e:
        print(f"Login failed: {e.read().decode('utf-8')}")
        return

    # 2. Create department
    create_url = f"{base_url}/api/departments"
    dept_data = json.dumps({
        "name": "Billing & Finance",
        "description": "Billing inquiries and financial support audits."
    }).encode("utf-8")
    
    req = urllib.request.Request(
        create_url,
        data=dept_data,
        headers={
            "Content-Type": "application/json",
            "Cookie": cookie_header
        }
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            dept = json.loads(response.read().decode("utf-8"))
            print(f"Successfully created department: {dept['name']} (ID: {dept['id']})")
            dept_id = dept['id']
    except urllib.error.HTTPError as e:
        print(f"Department creation failed: {e.read().decode('utf-8')}")
        return

    # 3. List departments
    list_url = f"{base_url}/api/departments"
    req = urllib.request.Request(
        list_url,
        headers={"Cookie": cookie_header}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            depts = json.loads(response.read().decode("utf-8"))
            print(f"Departments list: {[d['name'] for d in depts]}")
            assert any(d['id'] == dept_id for d in depts), "Created department not found in list!"
            print("Departments list check passed!")
    except urllib.error.HTTPError as e:
        print(f"Failed to list departments: {e.read().decode('utf-8')}")
        return

    # 4. Clean up / Delete department
    delete_url = f"{base_url}/api/departments/{dept_id}"
    req = urllib.request.Request(
        delete_url,
        headers={"Cookie": cookie_header},
        method="DELETE"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode("utf-8"))
            print(f"Successfully deleted department: {res['message']}")
    except urllib.error.HTTPError as e:
        print(f"Failed to delete department: {e.read().decode('utf-8')}")
        return

    print("All backend API tests completed successfully!")

if __name__ == "__main__":
    test_api()
