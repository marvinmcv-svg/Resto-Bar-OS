output "vm_public_ip" { value = module.compute.vm_public_ip description = "Public IP of the RestaurantOS VM" }
output "vm_private_ip" { value = module.compute.vm_private_ip description = "Private IP of the RestaurantOS VM" }
output "db_connection_string" { value = module.db.db_connection_string description = "PostgreSQL connection string" }
output "vcn_id" { value = module.network.vcn_id description = "VCN ID" }
output "subnet_id" { value = module.network.subnet_id description = "Subnet ID" }
