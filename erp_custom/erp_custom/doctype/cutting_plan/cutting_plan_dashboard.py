# from frappe import _


# def get_data():
# 	return {
# 		"fieldname": "project",
# 		"non_standard_fieldnames": {
# 			"Auto Repeat": "reference_document",
# 		},
# 		"transactions": [
# 			# {"label": _("Customer Request For Quotation"), "items": ["Customer Request For Quotation"]},
# 			# {"label": _("Estimate"), "items": ["Estimate"]},
# 			# {"label": _("Quotation"), "items": ["Quotation"]},
#             {"label": _("Project"), "items": ["Project"]},
# 		],
# 	}



# from frappe import _

# def get_data():
#     return {
#         "fieldname": "project",
#         "transactions": [
#             {
#                 "label": _("Project"),
#                 "items": ["Project"]
#             }
#         ],
#     }


from frappe import _

def get_data():
    return {
        "fieldname": "project",
        # "non_standard_fieldnames": {
        #     # "Auto Repeat": "reference_document",
        #     "Project": "name"
        # },
        "transactions": [
            {
                "label": _("Project"),
                "items": ["Project"]
            }
        ],
    }