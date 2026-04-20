# from frappe import _


# def get_data():
# 	return {
# 		"fieldname": "prevdoc_docname",
# 		"non_standard_fieldnames": {
# 			"Auto Repeat": "reference_document",
# 		},
# 		"transactions": [
# 			{"label": _("Customer Request For Quotation"), "items": ["Customer Request For Quotation"]},
# 			{"label": _("Estimate"), "items": ["Estimate"]},
# 			{"label": _("Quotation"), "items": ["Quotation"]},
# 		],
# 	}



# from frappe import _

# def get_data(data=None):
#     return {
#         "fieldname": "project",
#         "transactions": [
#             {
#                 "label": _("Manufacturing"),
#                 "items": ["Cutting Plan"]
#             },
#             {
#                 "label": _("Quality"),
#                 "items": ["Quality Assurance Plan"]   # use exact doctype name
#             }
#         ]
#     }


# import frappe

# def project_onload(doc, method=None):
#     """
#     This runs when Project form loads
#     Safe: does not override core
#     """

#     # Add custom dashboard data dynamically
#     if not hasattr(doc, "__onload"):
#         doc.set_onload("__custom_dashboard", {})

#     doc.__onload["__custom_dashboard"] = {
#         "transactions": [
#             {
#                 "label": "Manufacturing",
#                 "items": ["Cutting Plan"]
#             },
#             {
#                 "label": "Quality",
#                 "items": ["Quality Assurance Plan"]
#             }
#         ]
#     }



from frappe import _

def get_data(data=None):

    return {
        "heatmap": True,
        "heatmap_message": _("This is based on the Time Sheets created against this project"),
        "fieldname": "project",

        "transactions": [
            {
                "label": _("Project"),
                "items": ["Task", "Timesheet", "Issue", "Project Update"],
            },
            {
                "label": _("Material"),
                "items": ["Material Request", "BOM Creator", "BOM", "Stock Entry"],
            },
            {
                "label": _("Sales"),
                "items": ["Sales Order", "Delivery Note", "Sales Invoice"],
            },
            {
                "label": _("Purchase"),
                "items": ["Purchase Order", "Purchase Receipt", "Purchase Invoice"],
            },
            {
                "label": _("Manufacture"),
                "items": ["Work Order", "Cutting Plan"],
            },

            # ✅ YOUR CUSTOM (add here safely)
            # {
            #     "label": _("Manufacturing"),
            #     "items": ["Cutting Plan"],
            # },
            {
                "label": _("Quality"),
                "items": ["Quality Assurance Plan"],
            },
        ],
    }