resource "oci_database_db_system" "postgres" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ad.name
  shape               = "VM.Standard.A1.Flex"
  subnet_id           = var.subnet_id
  database_edition    = "oracle-enterprisedb"
  cdb_name            = "restauranoscdb"
  pdb_name            = "restauranospdb"
  admin_password      = var.db_admin_password
  cpu_core_count      = 1
  memory_in_gbs       = 4
  node_count          = 1
}

data "oci_identity_availability_domains" "ad" {
  compartment_id = var.compartment_ocid
}

output "db_connection_string" {
  value = oci_database_db_system.postgres.connection_strings
}
