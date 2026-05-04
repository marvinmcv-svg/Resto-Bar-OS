# Network module variables
variable "compartment_ocid" { description = "OCID of your compartment" }
variable "vcn_cidr" { description = "CIDR block for the VCN" default = "10.0.0.0/16" }
