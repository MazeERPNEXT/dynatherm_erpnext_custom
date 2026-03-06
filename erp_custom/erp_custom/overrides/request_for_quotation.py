
import frappe
from frappe.model.document import Document


class RequestforQuotation(Document):

    @frappe.whitelist()
    def process_item_selection(self, item_idx=None):
        pass


def send_email_background(doc, method=None):

    # -------------------------------------------------
    # Prevent ERPNext default RFQ email
    # -------------------------------------------------
    doc.flags.ignore_email = True

    # -------------------------------------------------
    # Collect Supplier Emails
    # -------------------------------------------------
    recipients = []

    for s in doc.suppliers:
        if s.email_id:
            recipients.append(s.email_id)

    if not recipients:
        frappe.log_error("No supplier emails found", "RFQ Email")
        return

    # -------------------------------------------------
    # Optional Columns Logic
    # -------------------------------------------------
    optional_fields = [
        ("Length", "custom_length"),
        ("Width", "custom_width"),
        ("Thickness", "custom_thickness"),
        ("Outer Diameter", "custom_outer_diameter"),
        ("Inner Diameter", "custom_inner_diameter"),
        ("Wall Thickness", "custom_wall_thickness")
    ]

    visible_fields = []

    for label, fieldname in optional_fields:
        for d in doc.items:
            if d.get(fieldname):
                visible_fields.append((label, fieldname))
                break

    # -------------------------------------------------
    # Table Header
    # -------------------------------------------------
    header_html = """
        <th>Item Code</th>
        <th>Schedule Date</th>
        <th>Qty</th>
        <th>UOM</th>
    """

    for label, fieldname in visible_fields:
        header_html += f"<th>{label}</th>"

    header_html += """
        <th>Rate</th>
        <th>Amount</th>
    """

    # -------------------------------------------------
    # Table Rows
    # -------------------------------------------------
    items_html = ""

    for d in doc.items:

        row = f"""
        <tr>
            <td>{d.item_code or ""}</td>
            <td>{d.schedule_date or ""}</td>
            <td>{d.qty or ""}</td>
            <td>{d.uom or ""}</td>
        """

        for label, fieldname in visible_fields:
            row += f"<td>{d.get(fieldname) or ''}</td>"

        row += """
            <td></td>
            <td></td>
        </tr>
        """

        items_html += row

    # -------------------------------------------------
    # Email Subject
    # -------------------------------------------------
    subject = f"Request for Quotation: {doc.name}"

    # -------------------------------------------------
    # Email Message
    # -------------------------------------------------
    message = f"""
    <h2 style="color:#2c3e50;">Dear Supplier,</h2>
    <p>{doc.message_for_supplier or ""}</p><br>

    <h3 style="border-bottom:2px solid #444; padding-bottom:4px;"> RFQ Details </h3>

    <p style="margin-left:15px;"><b>RFQ No:</b> {doc.name}</p>
    <p style="margin-left:15px;"><b>Date:</b> {doc.transaction_date}</p>
    <p style="margin-left:15px;"><b>Schedule Date:</b> {doc.schedule_date}</p><br>

    <h3 style="border-bottom:2px solid #444; padding-bottom:4px;"> Item Details </h3>
    <table border="1"
           cellpadding="8"
           cellspacing="0"
           style="border-collapse:collapse; width:100%; text-align:center;">

        <tr style="background-color:#f2f2f2;">
            {header_html}
        </tr>

        {items_html}

    </table>
    <br>

    <p>Kindly submit your quotation at the earliest.</p> <br>

    <p><b>Regards,</b><br> Purchase Team </p>
    """

    # -------------------------------------------------
    # Send Email
    # -------------------------------------------------
    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        sender="msk312508@gmail.com",
        reference_doctype="Request for Quotation",
        reference_name=doc.name
    )


# -----------------------------------------------------------------
# BLOCK ERPNext CORE RFQ EMAIL
# -----------------------------------------------------------------

import erpnext.buying.doctype.request_for_quotation.request_for_quotation as rfq_core


def stop_core_rfq_email(self):
    """
    Override ERPNext default email sending method
    so only custom email will be triggered
    """
    frappe.logger().info("ERPNext RFQ Default Email Blocked by Custom App")
    return


# Override core method
rfq_core.RequestforQuotation.send_to_supplier = stop_core_rfq_email