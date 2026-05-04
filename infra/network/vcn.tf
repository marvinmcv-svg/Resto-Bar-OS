resource "oci_core_vcn" "restauranos_vcn" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = ["10.0.0.0/16"]
  display_name   = "restauranos-vcn"
}

resource "oci_core_subnet" "public_subnet" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.restauranos_vcn.id
  cidr_block     = "10.0.1.0/24"
  route_table_id = oci_core_vcn.restauranos_vcn.default_route_table_id
  security_list_ids = [oci_core_security_list.restauranos_security.id]
  display_name   = "public-subnet"
}

resource "oci_core_internet_gateway" "restauranos_ig" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.restauranos_vcn.id
  enabled        = true
}

resource "oci_core_security_list" "restauranos_security" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.restauranos_vcn.id
  display_name   = "restauranos-security"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  ingress_security_rules {
    protocol = "6" # TCP
    source   = "0.0.0.0/0"
    tcp_options {
      min = 22
      max = 22
    }
  }
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 80; max = 80 }
  }
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 443; max = 443 }
  }
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 3000; max = 3000 }
  }
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 3001; max = 3001 }
  }
}

output "subnet_id" { value = oci_core_subnet.public_subnet.id }
output "vcn_id" { value = oci_core_vcn.restauranos_vcn.id }
