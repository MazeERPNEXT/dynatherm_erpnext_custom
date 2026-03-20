
import frappe

@frappe.whitelist()
def validate_item_workflow(item_code=None, supplier=None):

    # -------------------------
    # SUPPLIER VALIDATION 
    # -------------------------
    if supplier:
        supplier_state = frappe.db.get_value("Supplier", supplier, "workflow_state")

        if supplier_state == "Draft":
            return {
                "status": "error",
                "message": f"Supplier {supplier} is in Draft state. Not allowed in Purchase Order."
            }

    # -------------------------
    # ITEM VALIDATION
    # -------------------------
    if item_code:
        item_state = frappe.db.get_value("Item", item_code, "workflow_state")

        if item_state == "Draft":
            return {
                "status": "error",
                "message": f"Item {item_code} is in Draft state. Not allowed in Purchase Order."
            }

    return {"status": "ok"}