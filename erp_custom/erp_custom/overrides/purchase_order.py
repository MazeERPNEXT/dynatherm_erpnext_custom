
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
def send_purchase_email(purchase_order):

    po = frappe.get_doc("Purchase Order", purchase_order)
    company = frappe.get_doc("Company", po.company)

    # 🔹 Get Company Address
    company_address = frappe.db.get_value(
        "Dynamic Link",
        {"link_doctype": "Company", "link_name": company.name},
        "parent"
    )

    address_doc = frappe.get_doc("Address", company_address) if company_address else None
    company_full_address = address_doc.get_display() if address_doc else ""

    # 🔹 Supplier Address
    supplier_address = ""
    if po.supplier_address:
        supplier_address = frappe.get_doc("Address", po.supplier_address).get_display()

    # 🔹 Items Table
    items_html = ""
    for i, item in enumerate(po.items, start=1):
        items_html += f"""
        <tr>
            <td style="border:1px solid #ccc; padding:5px;">{i}</td>
            <td style="border:1px solid #ccc; padding:5px;">{item.item_name}</td>
            <td style="border:1px solid #ccc; padding:5px; text-align:right;">{item.qty}</td>
            <td style="border:1px solid #ccc; padding:5px; text-align:right;">{item.rate}</td>
            <td style="border:1px solid #ccc; padding:5px; text-align:right;">{item.amount}</td>
        </tr>
        """

    # 🔹 Final HTML
    message = f"""
    <div style="font-family: Arial; font-size: 13px;">

        <!-- 🔰 TOP CENTER -->
        <div style="text-align:center;">
            <h2 style="color:green; margin-bottom:5px;">{company.name}</h2>
            <div>{company_full_address}</div>
            <h3 style="margin-top:10px;">Company Billing Address</h3>
        </div>

        <br>

        <!-- 🔰 LEFT & RIGHT -->
        <table width="100%" style="margin-top:10px;">
            <tr>
                <!-- LEFT -->
                <td width="50%" valign="top">
                    <b>Purchase Order:</b> {po.name}<br>
                    <b>DAPL Job Reference:</b> {po.get("custom_job_reference") or ""}<br>
                    <b>Supplier Reference:</b> {po.get("supplier_reference") or ""}<br>
                    <b>Supplier Name:</b> {po.supplier}<br>
                    <b>Supplier Address:</b><br>{supplier_address}<br>
                    <b>Contact Name:</b> {po.contact_person or ""}<br>
                    <b>Contact Mobile No:</b> {po.contact_mobile or ""}<br>
                </td>

                <!-- RIGHT -->
                <td width="50%" valign="top">
                    <b>Date:</b> {po.transaction_date}<br>
                    <b>Required By:</b> {po.schedule_date or ""}<br>
                    <b>Company Billing Address:</b><br>
                    {company_full_address}
                </td>
            </tr>
        </table>

        <br>

        <!-- 🔰 ITEMS TABLE -->
        <table width="100%" style="border-collapse: collapse;">
            <tr style="background:#f2f2f2;">
                <th style="border:1px solid #ccc; padding:5px;">S.No</th>
                <th style="border:1px solid #ccc; padding:5px;">Description</th>
                <th style="border:1px solid #ccc; padding:5px;">Qty</th>
                <th style="border:1px solid #ccc; padding:5px;">Rate</th>
                <th style="border:1px solid #ccc; padding:5px;">Amount</th>
            </tr>
            {items_html}
        </table>

        <br>

        <!-- 🔰 TOTAL SECTION -->
        <table width="100%">
            <tr>
                <td width="50%">
                    <b>Total Qty:</b> {sum([d.qty for d in po.items])}
                </td>
                <td width="50%" style="text-align:right;">
                    <b>Total:</b> {po.total}<br>
                    <b>Rounded Total:</b> {po.rounded_total}<br>
                    <b>In Words:</b> {po.in_words}
                </td>
            </tr>
        </table>

    </div>
    """

    frappe.sendmail(
        recipients=["msk312508@gmail.com"],
        subject=f"Purchase Order - {po.name}",
        message=message
    )

    return "Mail Sent"

# @frappe.whitelist()
# def send_purchase_email(purchase_order):

#     po = frappe.get_doc("Purchase Order", purchase_order)

#     subject = f"Purchase Order Approved - {po.name}"

#     message = f"""
#     Dear Purchase Team,<br><br>

#     The Purchase Order <b>{po.name}</b> has been Approved.<br><br>

#     <b>Supplier:</b> {po.supplier}<br>
#     <b>Transaction Date:</b> {po.transaction_date}<br>
#     <b>Total Amount:</b> {po.grand_total}<br><br>

#     Kindly proceed with further purchase process.<br><br>

#     Regards,<br>
#     ERP System
#     """

#     frappe.sendmail(
#         recipients=["purchase@dapl.com"],
#         subject=subject,
#         message=message
#     )

#     return "done"