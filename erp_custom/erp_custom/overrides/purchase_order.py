import frappe
from frappe.utils import flt

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
                "message": f"Supplier Master {supplier} is in Draft state. Not allowed in Purchase Order."
            }

    # -------------------------
    # ITEM VALIDATION
    # -------------------------
    if item_code:
        item_state = frappe.db.get_value("Item", item_code, "workflow_state")

        if item_state == "Draft":
            return {
                "status": "error",
                "message": f"Item Master {item_code} is in Draft state. Not allowed in Purchase Order."
            }

    return {"status": "ok"}


@frappe.whitelist()
def sent_po_supplier(doc):

    if isinstance(doc, str):
        doc = frappe.get_doc("Purchase Order", doc)

    # Get supplier email
    supplier_email = doc.contact_email or frappe.db.get_value("Supplier", doc.supplier, "email_id")
    if not supplier_email:
        frappe.msgprint("⚠️ Supplier email not found.")
        return

    # Print Format
    print_format_name = "Purchase Order Standard"
    pdf_data = frappe.get_print("Purchase Order", doc.name, print_format=print_format_name, as_pdf=True)
    file_name = f"{doc.name}.pdf"

    subject = f"Purchase Order {doc.name}"
    message = f"""
    <p>Dear {doc.supplier},</p>
    <p>Please find attached the Purchase Order <b>{doc.name}</b>.</p>
    <p><a href="{frappe.utils.get_url_to_form('Purchase Order', doc.name)}">View Purchase Order</a></p><br>
    <p>Kindly submit your quotation at the earliest.</p><br>
    <p><b>Regards,</b><br>Purchase Team</p>
    """

    frappe.sendmail(
        sender="purchase@dynatherm.co.in",
        reply_to="purchase@dynatherm.co.in", 
        recipients=[supplier_email],
        subject=subject,
        message=message,
        attachments=[{
            "fname": file_name,
            "fcontent": pdf_data
        }]
    )

    frappe.msgprint(f"✅ Purchase Order sent to {supplier_email}")


# =========================================================
# WEIGHT BASED AMOUNT (FINAL OVERRIDE)
# =========================================================
def apply_weight_amount(doc):
    conversion_rate = flt(doc.conversion_rate or 1)

    for item in doc.get("items", []):
        weight = flt(item.custom_total_weights)
        rate = flt(item.rate)

        if not weight or not rate:
            continue

        try:
            new_amount = flt(weight * rate, 2)

            item.amount = new_amount
            item.base_amount = flt(new_amount * conversion_rate, 2)

            item.net_amount = new_amount
            item.base_net_amount = flt(new_amount * conversion_rate, 2)

            if hasattr(item, "custom_amount_inr"):
                item.custom_amount_inr = new_amount

        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                "Weight Amount Override Error"
            )

def purchase_order_before_save(doc, method=None):
    apply_weight_amount(doc)