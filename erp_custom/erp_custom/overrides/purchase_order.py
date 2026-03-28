
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

    # 🔹 Company Address
    company_address = frappe.db.get_value(
        "Dynamic Link",
        {"link_doctype": "Company", "link_name": company.name},
        "parent"
    )

    address_doc = frappe.get_doc("Address", company_address) if company_address else None
    company_full_address = address_doc.get_display() if address_doc else ""

    # 🔹 Company Email (from Contact)
    company_email = frappe.db.get_value("Contact", {
        "link_doctype": "Company",
        "link_name": company.name,
        "is_primary_contact": 1
    }, "email_id") or ""

    # 🔹 Company GST (from Address)
    company_gstin = frappe.db.get_value(
        "Address",
        company_address,
        "gstin"
    ) if company_address else ""

    # 🔹 Supplier Address
    supplier_address = ""
    if po.supplier_address:
        supplier_address = frappe.get_doc("Address", po.supplier_address).get_display()

    # 🔹 Items Table
    items_html = ""
    for i, item in enumerate(po.items, start=1):
        items_html += f"""
        <tr>
            <td style="border:1px solid #ddd; padding:6px;">{i}</td>
            <td style="border:1px solid #ddd; padding:6px;">{item.item_name}</td>
            <td style="border:1px solid #ddd; padding:6px; text-align:right;">{item.qty}</td>
            <td style="border:1px solid #ddd; padding:6px; text-align:right;">{item.rate}</td>
            <td style="border:1px solid #ddd; padding:6px; text-align:right;">{item.amount}</td>
        </tr>
        """

    # 🔹 FINAL HTML
    message = f"""
    <div style="font-family:Arial; font-size:13px; color:#333; padding:20px; line-height:1.6;">

        <!-- HEADER -->
        <div style="text-align:center; border-bottom:2px solid #2e7d32; padding-bottom:10px;">
            <h1 style="color:#2e7d32; margin:0;">{company.name}</h1>

            <div style="font-size:12px; color:#555; margin-top:5px;">
                {company_full_address.replace("<br>", ", ")}
            </div>

            <div style="font-size:12px; margin-top:5px;">
                <b>Email:</b> {company_email or "-"} &nbsp;&nbsp; | &nbsp;&nbsp;
                <b>GST:</b> {company_gstin or "-"}
            </div>
        </div>

        <h2 style="text-align:center; margin:15px 0;">PURCHASE ORDER</h2>

        <!-- INFO -->
        <table width="100%" style="border-collapse:collapse;">
            <tr>

                <!-- LEFT -->
                <td width="50%" style="border:1px solid #ddd; padding:12px; vertical-align:top;">
                    <b>Purchase Order:</b> {po.name}<br>
                    <b>DAPL Job Reference:</b> {po.get("custom_job_reference") or ""}<br>
                    <b>Supplier Reference:</b> {po.get("supplier_reference") or ""}<br>
                    <b>Supplier Name:</b> {po.supplier}<br><br>

                    <b>Supplier Address:</b><br>
                    <div style="margin-top:5px; color:#555;">
                        {supplier_address}
                    </div><br>

                    <b>Contact Name:</b> {po.contact_person or ""}<br>
                    <b>Contact Mobile:</b> {po.contact_mobile or ""}
                </td>

                <!-- RIGHT -->
                <td width="50%" style="border:1px solid #ddd; padding:12px; vertical-align:top;">
                    <b>Date:</b> {po.transaction_date}<br>
                    <b>Required By:</b> {po.schedule_date or ""}<br><br>

                    <b>Company Billing Address:</b><br>
                    <div style="margin-top:5px; color:#555;">
                        {company_full_address}
                    </div>
                </td>

            </tr>
        </table>

        <br>

        <!-- ITEMS -->
        <table width="100%" style="border-collapse:collapse;">
            <tr style="background:#2e7d32; color:white;">
                <th style="padding:8px; border:1px solid #ddd;">S.No</th>
                <th style="padding:8px; border:1px solid #ddd;">Description</th>
                <th style="padding:8px; border:1px solid #ddd;">Qty</th>
                <th style="padding:8px; border:1px solid #ddd;">Rate</th>
                <th style="padding:8px; border:1px solid #ddd;">Amount</th>
            </tr>
            {items_html}
        </table>

        <br>

        <!-- TOTAL -->
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
        sender="purchase@dynatherm.co.in", 
        recipients=["msk312508@gmail.com"],
        subject=f"Purchase Order - {po.name}",
        message=message
    )

    return {
        "company_name": company.name,
        "company_address": company_full_address,
        "company_email": company_email,
        "company_gstin": company_gstin,
        "po": po.name,
        "job_ref": po.get("custom_job_reference"),
        "supplier": po.supplier,
        "contact_name": po.contact_person,
        "date": po.transaction_date,
        "required_by": po.schedule_date,
        "billing_address": company_full_address
    }

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