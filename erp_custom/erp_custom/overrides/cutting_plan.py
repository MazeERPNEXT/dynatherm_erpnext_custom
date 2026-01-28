import frappe

@frappe.whitelist()
def create_cutting_plan_from_bom(bom_name):
    bom = frappe.get_doc("BOM", bom_name)

    cp = frappe.new_doc("Cutting Plan")
    cp.project = bom.project
    cp.item_to_manufacture = bom.item

    for row in bom.items:
        cp.append("cutting_plan_item", {
            "project": bom.project,
            "item_code": row.item_code,
            "uom": row.uom,
            "qty": row.qty,
            "length": row.custom_length,
            "width": row.custom_width,
            "thickness": row.custom_thickness,
            "density": row.custom_density,
            "kgs_per_unit": row.custom_kilogramskgs,
            "total_weight":row.custom_total_weight,
            "scrap_margin": row.custom_scrap_margin_percentage,
            "scrap_margin_kg": row.custom_scrap_margin_kgs,
        })

    cp.insert(ignore_permissions=True)
    return cp.name
