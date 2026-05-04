# RestaurantOS — Oracle Cloud Infrastructure

## Prerequisites
1. Oracle Cloud account (free tier)
2. OCI API Key pair
3. Terraform >= 1.0

## Setup

1. Generate OCI API keys:
```bash
mkdir -p ~/.oci
openssl genrsa -out ~/.oci/oci_api_key.pem 2048
openssl rsa -pubout -in ~/.oci/oci_api_key.pem -out ~/.oci/oci_api_key_public.pem
```

2. Upload public key to OCI console: Identity → Users → API Keys → Add Public Key

3. Get OCIDs from OCI console:
   - Tenancy OCID: top of any page
   - User OCID: Identity → Users → your user
   - Compartment OCID: Identity → Compartments → your compartment

4. Create `infra/terraform.tfvars`:
```hcl
tenancy_ocid     = "ocid1.tenancy.oc1...."
user_ocid        = "ocid1.user.oc1...."
fingerprint      = "xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx"
private_key_path = "/home/user/.oci/oci_api_key.pem"
region           = "us-ashburn-1"
compartment_ocid = "ocid1.compartment.oc1...."
ssh_public_key_path = "/home/user/.ssh/id_rsa.pub"
db_admin_password = "YourStrongPostgresPassword!"
```

5. Initialize and apply:
```bash
cd infra
terraform init
terraform plan
terraform apply
```

6. After apply, get the VM public IP:
```bash
terraform output vm_public_ip
```

7. SSH into the VM and run deployment:
```bash
ssh opc@<vm_public_ip>
git clone https://github.com/marvinmcv-svg/Resto-Bar-OS.git
cd Resto-Bar-OS
# ... follow DEPLOY.md
```
