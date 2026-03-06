
# import frappe
# from frappe.model.document import Document

# class RequestforQuotation(Document):

#     def on_submit(self):
#         send_email_background(self)
        
#     @frappe.whitelist()    
#     def process_item_selection(self, item_idx=None):
#         pass


# # def send_email_background(doc):

# #     recipients = [
# # 		"pandiyarajan@mazeworkssolutions.com"
# # 	] 

# #     if not recipients:
# #         frappe.log_error("No recipients found", "RequestforQuotation Email")
# #         return

    

# #     subject = f"Approval Request: Customer RequestforQuotation of Material | Doc Name:  | Customer Name: | Invoice No: "

# #     message = f"""
# #         <p>Dear Sir,</p>

# #         <p>We would like to inform you that the material details have been rejected by the customer.</p>
# #         <p>Kindly review the details and provide your approval for further action.</p>

# #         <p>Please provide your approval/comments in the system.</p>
# #         <br>

# #         <p>Regards,<br>
# #         IPR - Despatch</p>
# #     """

# #     frappe.sendmail(
# #         recipients=recipients,
# #         subject=subject,
# #         message=message,
# #         sender="msk312508@gmail.com",
# #         now=True,
# #         reference_doctype="Request for Quotation"
# #     )


# def send_email_background(doc):

#     # Collect supplier emails from child table
#     recipients = []
#     for s in doc.suppliers:
#         if s.email_id:
#             recipients.append(s.email_id)

#     if not recipients:
#         frappe.log_error("No supplier emails found", "RFQ Email")
#         return

#     # Build Item Table
#     items_html = ""
#     for d in doc.items:
#         items_html += f"""
#         <tr>
#             <td>{d.item_code or ""}</td>
#             <td>{d.schedule_date or ""}</td>
#             <td>{d.qty or ""}</td>
#             <td>{d.uom or ""}</td>
#             <td></td>
#     		<td></td>
#         </tr>
#         """

#     subject = f"Request for Quotation: {doc.name}"
    
#     message = f"""
# 		<h2 style="color:#2c3e50;">Dear Supplier,</h2>
# 		<p>{doc.message_for_supplier or ""}</p> <br>

# 		<h3 style="border-bottom:2px solid #444; padding-bottom:4px;">RFQ Details</h3>

# 		<p style="margin-left:15px;"><b>RFQ No:</b> {doc.name}</p>
# 		<p style="margin-left:15px;"><b>Date:</b> {doc.transaction_date}</p> <br>

# 		<h3 style="border-bottom:2px solid #444; padding-bottom:4px;">Item Details</h3>
# 		<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; width:100%; text-align:center;">
# 			<tr style="background-color:#f2f2f2;">
# 				<th>Item Code</th>
# 				<th>Schedule Date</th>
# 				<th>Qty</th>
# 				<th>UOM</th>
# 				<th>Rate</th>
# 				<th>Amount</th>
# 			</tr>
# 			{items_html}
# 		</table> <br>

# 		<p>Kindly submit your quotation at the earliest.</p> <br>

# 		<p><b>Regards,</b><br>
# 		Purchase Team</p>
# 		"""

#     frappe.sendmail(
#         recipients=recipients,
#         subject=subject,
#         message=message,
#         sender="msk312508@gmail.com",
#         now=True,
#         reference_doctype="Request for Quotation",
#         reference_name=doc.name
#     )


import frappe
from frappe.model.document import Document

class RequestforQuotation(Document):

    @frappe.whitelist()
    def process_item_selection(self, item_idx=None):
        pass


def send_email_background(doc, method=None):

    # Collect supplier emails
    recipients = []
    for s in doc.suppliers:
        if s.email_id:
            recipients.append(s.email_id)

    if not recipients:
        frappe.log_error("No supplier emails found", "RFQ Email")
        return

    # Build item table
    items_html = ""
    for d in doc.items:
        items_html += f"""
        <tr>
            <td>{d.item_code or ""}</td>
            <td>{d.schedule_date or ""}</td>
            <td>{d.qty or ""}</td>
            <td>{d.uom or ""}</td>
            <td></td>
            <td></td>
        </tr>
        """

    subject = f"Request for Quotation: {doc.name}"

    message = f"""
    <h2 style="color:#2c3e50;">Dear Supplier,</h2>
    <p>{doc.message_for_supplier or ""}</p><br>

    <h3 style="border-bottom:2px solid #444; padding-bottom:4px;">RFQ Details</h3>

    <p style="margin-left:15px;"><b>RFQ No:</b> {doc.name}</p>
    <p style="margin-left:15px;"><b>Date:</b> {doc.transaction_date}</p><br>

    <h3 style="border-bottom:2px solid #444; padding-bottom:4px;">Item Details</h3>

    <table border="1" cellpadding="8" cellspacing="0"
    style="border-collapse:collapse; width:100%; text-align:center;">
        <tr style="background-color:#f2f2f2;">
            <th>Item Code</th>
            <th>Schedule Date</th>
            <th>Qty</th>
            <th>UOM</th>
            <th>Rate</th>
            <th>Amount</th>
        </tr>
        {items_html}
    </table><br>

    <p>Kindly submit your quotation at the earliest.</p><br>

    <p><b>Regards,</b><br>
    Purchase Team</p>
    """

    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        sender="msk312508@gmail.com",
        reference_doctype="Request for Quotation",
        reference_name=doc.name
    )