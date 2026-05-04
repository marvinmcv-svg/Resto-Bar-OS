module "network" {
  source           = "./network"
  compartment_ocid = var.compartment_ocid
  vcn_cidr        = "10.0.0.0/16"
}

module "compute" {
  source           = "./compute"
  compartment_ocid = var.compartment_ocid
  subnet_id        = module.network.subnet_id
  vcn_id           = module.network.vcn_id
}

module "db" {
  source           = "./db"
  compartment_ocid = var.compartment_ocid
  subnet_id        = module.network.subnet_id
}
