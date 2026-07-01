"""Synthetic SEBI-style circulars for the PRAXIS demo corpus.

These are *fabricated* documents written in the style and structure of real SEBI
circulars (reference numbers, addressee classes, numbered obligation paragraphs with
mandatory modal verbs, deadlines, cross-references and annexures). They are NOT real
SEBI instruments and must not be relied upon for actual compliance. Their purpose is to
exercise the full parse → RAG → extraction → rule → workflow pipeline offline.

``build_pdfs.py`` renders each entry to ``data/corpus/<slug>.pdf``.
"""
from __future__ import annotations

# Each circular: slug, reference, title, date, addressed_to, preamble, and a list of
# (number, heading|None, body) paragraphs. Annexure paragraphs use labels like "A.1".

CIRCULARS: list[dict] = [
    {
        "slug": "margin_pledge",
        "reference": "SEBI/HO/MIRSD/MIRSD-PoD-1/P/CIR/2024/04",
        "title": "Framework for Margin Pledge and Re-pledge in the Depository System",
        "date": "12 January 2024",
        "addressed_to": (
            "All Stock Brokers through Recognised Stock Exchanges; "
            "All Depository Participants through Depositories"
        ),
        "preamble": (
            "1. This circular is issued in exercise of powers conferred under Section 11(1) "
            "of the Securities and Exchange Board of India Act, 1992, read with Regulation 31 "
            "of the SEBI (Stock Brokers) Regulations, 1992, to protect the interests of "
            "investors in securities and to promote the development of, and to regulate, the "
            "securities market. This circular modifies the operational requirements specified "
            "in SEBI circular SEBI/HO/MIRSD/DOP/CIR/P/2020/28 dated February 25, 2020."
        ),
        "paragraphs": [
            (
                "2",
                "Pledge of Securities for Margin",
                "With effect from April 1, 2024, every stock broker shall accept client "
                "securities as collateral for margin obligations only by way of a margin "
                "pledge created in the depository system. The practice of accepting securities "
                "by way of transfer to the broker's demat account for the purpose of margin "
                "shall be discontinued. No stock broker shall hold client securities in any "
                "account other than the client's own demat account with a margin pledge marked "
                "in favour of the trading member or clearing member.",
            ),
            (
                "3",
                "Client Authorisation",
                "The stock broker shall obtain a specific authorisation from the client for "
                "creation of a margin pledge. The broker is required to maintain a record of "
                "such authorisations and must ensure that the pledge is created only against an "
                "actual margin obligation. The authorisation shall be renewed on a yearly basis "
                "and the broker shall preserve evidence of renewal for a period of five years.",
            ),
            (
                "4",
                "System and Reporting Requirements",
                "Every stock broker shall upgrade its back-office and risk management systems to "
                "support margin pledge and re-pledge instructions within sixty (60) days from "
                "the date of this circular. The broker must reconcile the pledged securities "
                "with the depository records on a daily basis and shall report any discrepancy "
                "to the depository by the end of the next trading day.",
            ),
            (
                "5",
                "Disclosure to Clients",
                "The stock broker is required to disclose, on its website and in the client "
                "onboarding documents, the manner in which client securities may be pledged and "
                "the rights of the client in respect of such pledged securities. This disclosure "
                "shall be implemented within thirty (30) days from the date of this circular.",
            ),
            (
                "6",
                "Confirmation of Compliance",
                "Every stock broker shall confirm compliance with the provisions of this circular "
                "to the relevant stock exchange by way of a board-approved policy and shall file "
                "a compliance certificate signed by the Principal Officer not later than "
                "April 30, 2024.",
            ),
        ],
    },
    {
        "slug": "cyber_security",
        "reference": "SEBI/HO/MIRSD/TPD/CIR/2024/19",
        "title": "Cyber Security and Cyber Resilience Framework for Stock Brokers and Depository Participants",
        "date": "03 March 2024",
        "addressed_to": "All Stock Brokers and Depository Participants",
        "preamble": (
            "1. With the increasing adoption of technology in the securities market, it has "
            "become necessary to strengthen the cyber security posture of registered "
            "intermediaries. This circular supersedes the cyber security advisory issued vide "
            "SEBI/HO/MIRSD/CIR/2018/XX and is issued under Section 11(1) of the SEBI Act, 1992."
        ),
        "paragraphs": [
            (
                "2",
                "Governance",
                "Every stock broker and depository participant shall formulate a comprehensive "
                "cyber security and cyber resilience policy approved by its Board of Directors. "
                "The policy must be reviewed at least once every financial year and the intermediary "
                "shall designate a senior official as the Chief Information Security Officer (CISO) "
                "responsible for implementation.",
            ),
            (
                "3",
                "Vulnerability Assessment and Penetration Testing",
                "The intermediary is required to conduct a Vulnerability Assessment and Penetration "
                "Testing (VAPT) of its critical systems at least once in a financial year. The VAPT "
                "shall be carried out by a CERT-In empanelled organisation and the intermediary must "
                "remediate all identified critical and high severity findings within thirty (30) days "
                "of the report.",
            ),
            (
                "4",
                "Incident Reporting",
                "All cyber-attacks, threats, and breaches experienced by the intermediary shall be "
                "reported to SEBI and to the relevant stock exchange or depository within six (6) "
                "hours of detection. The intermediary is required to maintain a log of all such "
                "incidents and the remedial action taken.",
            ),
            (
                "5",
                "Security Operations and Monitoring",
                "Every intermediary shall establish, either in-house or through a managed service "
                "provider, a mechanism for continuous monitoring of security events. Systems holding "
                "client data must enforce multi-factor authentication for all privileged access and "
                "the intermediary shall maintain audit logs for a minimum period of two (2) years.",
            ),
            (
                "6",
                "Periodic Audit and Submission",
                "The intermediary shall submit a half-yearly cyber audit report to the stock exchange "
                "or depository, as applicable, within fifteen (15) days from the end of each half-year. "
                "The provisions of this circular shall come into force with effect from June 1, 2024.",
            ),
        ],
    },
    {
        "slug": "kyc_periodicity",
        "reference": "SEBI/HO/MIRSD/SEC-5/P/CIR/2024/31",
        "title": "Periodic Review and Updation of KYC Records by Registered Intermediaries",
        "date": "18 April 2024",
        "addressed_to": "All Registered Intermediaries; All KYC Registration Agencies (KRAs)",
        "preamble": (
            "1. In order to ensure that Know Your Client (KYC) records maintained by registered "
            "intermediaries remain current, the periodicity of KYC updation is being specified. "
            "This circular is read in conjunction with the SEBI (KYC Registration Agency) "
            "Regulations, 2011 and the Master Circular on KYC dated May 12, 2023."
        ),
        "paragraphs": [
            (
                "2",
                "Risk-based Periodicity",
                "Registered intermediaries shall carry out periodic updation of KYC records of "
                "existing clients based on risk categorisation. The KYC records of clients "
                "categorised as high risk must be updated at least once every two (2) years, "
                "medium risk every eight (8) years, and low risk every ten (10) years.",
            ),
            (
                "3",
                "Verification of Updated Information",
                "Where there is a change in the KYC information, the intermediary is required to "
                "verify the updated information and upload the revised records to the KRA system "
                "within seven (7) working days of receipt. The intermediary shall preserve the "
                "supporting documents evidencing such verification.",
            ),
            (
                "4",
                "Client Intimation",
                "The intermediary shall intimate the client at least thirty (30) days in advance "
                "of the due date for KYC updation. Where the client does not respond, the "
                "intermediary must follow a documented escalation procedure before restricting "
                "the account.",
            ),
            (
                "5",
                "Implementation Timeline",
                "Intermediaries shall put in place the systems and procedures necessary to comply "
                "with this circular within ninety (90) days from the date of issuance. A "
                "board-approved policy on periodic KYC updation shall be adopted and a confirmation "
                "of implementation shall be filed with the KRA.",
            ),
        ],
    },
    {
        "slug": "outsourcing",
        "reference": "SEBI/HO/MIRSD/POD/CIR/2024/45",
        "title": "Guidelines on Outsourcing of Activities by Market Intermediaries",
        "date": "06 June 2024",
        "addressed_to": "All Market Intermediaries registered with SEBI",
        "preamble": (
            "1. Market intermediaries increasingly rely on third-party service providers for "
            "various activities. To ensure that such outsourcing does not compromise regulatory "
            "obligations, the following guidelines are issued under Section 11(1) of the SEBI "
            "Act, 1992. These guidelines amend the framework specified in the earlier circular "
            "on outsourcing dated December 15, 2011."
        ),
        "paragraphs": [
            (
                "2",
                "Core Activities Not to be Outsourced",
                "No market intermediary shall outsource its core business activities and "
                "compliance functions. The responsibility and accountability for outsourced "
                "activities shall at all times remain with the intermediary, which must not use "
                "outsourcing as a means of diluting its regulatory obligations.",
            ),
            (
                "3",
                "Outsourcing Policy",
                "Every market intermediary shall put in place a board-approved outsourcing policy. "
                "The policy must include criteria for selection of service providers, a risk "
                "assessment framework, and provisions for monitoring and control of outsourced "
                "activities. The policy shall be reviewed at least once a year.",
            ),
            (
                "4",
                "Agreements with Service Providers",
                "The intermediary is required to enter into a legally binding agreement with each "
                "service provider. The agreement shall provide SEBI and the intermediary the right "
                "to access the books, records and information held by the service provider, and "
                "must contain confidentiality and data protection clauses.",
            ),
            (
                "5",
                "Reporting of Material Outsourcing",
                "The intermediary shall report all material outsourcing arrangements to SEBI within "
                "thirty (30) days of entering into such arrangement. A list of all material "
                "outsourcing arrangements must be placed before the Board on a half-yearly basis. "
                "These guidelines shall be effective from August 1, 2024.",
            ),
        ],
    },
    {
        "slug": "business_continuity",
        "reference": "SEBI/HO/MIRSD/TPD/CIR/2024/58",
        "title": "Business Continuity Plan and Disaster Recovery Framework for Stock Brokers",
        "date": "22 July 2024",
        "addressed_to": "All Stock Brokers through Recognised Stock Exchanges",
        "preamble": (
            "1. To ensure continuity of critical operations during disruptions, stock brokers are "
            "required to maintain a robust Business Continuity Plan (BCP) and Disaster Recovery "
            "(DR) framework. This circular is issued under Section 11(1) of the SEBI Act, 1992."
        ),
        "paragraphs": [
            (
                "2",
                "BCP-DR Policy and Infrastructure",
                "Every stock broker shall establish a documented Business Continuity Plan and a "
                "Disaster Recovery site that is geographically separated from the primary data "
                "centre. The broker must ensure that the Recovery Time Objective (RTO) does not "
                "exceed forty-five (45) minutes and the Recovery Point Objective (RPO) does not "
                "exceed fifteen (15) minutes for critical systems.",
            ),
            (
                "3",
                "Periodic Drills",
                "The stock broker is required to conduct a live DR drill at least once every "
                "quarter and shall maintain records of each drill, including the time taken to "
                "restore operations. Any failure to meet the RTO or RPO during a drill must be "
                "reported to the stock exchange within seven (7) days.",
            ),
            (
                "4",
                "Designated Officials",
                "The stock broker shall designate officials responsible for invoking and managing "
                "the BCP-DR framework and must communicate their contact details to the stock "
                "exchange. The broker shall review and update the BCP-DR policy at least once "
                "every financial year.",
            ),
            (
                "5",
                "Implementation",
                "Stock brokers shall comply with the provisions of this circular with effect from "
                "October 1, 2024 and shall submit a confirmation of compliance to the stock "
                "exchange within fifteen (15) days of the said date.",
            ),
        ],
    },
    {
        "slug": "investor_grievance",
        "reference": "SEBI/HO/OIAE/IGRD/CIR/2024/72",
        "title": "Strengthening of Investor Grievance Redressal Mechanism and SCORES Integration",
        "date": "09 September 2024",
        "addressed_to": "All Registered Intermediaries",
        "preamble": (
            "1. With a view to strengthening the investor grievance redressal mechanism, the "
            "timelines and processes for handling complaints received through the SEBI Complaints "
            "Redress System (SCORES) are being revised. This circular supersedes the provisions "
            "relating to grievance timelines in the earlier circular dated August 1, 2020."
        ),
        "paragraphs": [
            (
                "2",
                "Resolution Timelines",
                "Every registered intermediary shall resolve investor complaints received through "
                "SCORES within twenty-one (21) calendar days of receipt. The intermediary is "
                "required to upload an Action Taken Report on the SCORES portal within the said "
                "period and must not allow any complaint to remain unaddressed beyond this timeline.",
            ),
            (
                "3",
                "Designated Grievance Officer",
                "The intermediary shall designate a Grievance Redressal Officer and shall display "
                "the name, contact number and email address of such officer prominently on its "
                "website. The intermediary must update these details within seven (7) days of any "
                "change.",
            ),
            (
                "4",
                "Periodic Reporting",
                "The intermediary is required to submit a monthly report on the status of investor "
                "complaints to the relevant stock exchange within seven (7) days from the end of "
                "each month. The report shall include the number of complaints received, resolved "
                "and pending.",
            ),
            (
                "5",
                "Effective Date",
                "The revised timelines specified in this circular shall come into force with effect "
                "from November 1, 2024.",
            ),
        ],
    },
    {
        "slug": "peak_margin",
        "reference": "SEBI/HO/MRD/RMD/CIR/2024/88",
        "title": "Upfront Collection of Margins and Peak Margin Reporting in the Cash and Derivatives Segments",
        "date": "21 October 2024",
        "addressed_to": "All Stock Brokers and Clearing Members",
        "preamble": (
            "1. To strengthen the risk management framework in the securities market, the "
            "requirements relating to upfront collection of margins and reporting of peak margin "
            "are specified. This circular modifies the margin collection requirements specified "
            "in SEBI/HO/MRD/RMD/CIR/2020/127 dated July 20, 2020."
        ),
        "paragraphs": [
            (
                "2",
                "Upfront Collection of Margin",
                "Every stock broker shall mandatorily collect the upfront initial margin and "
                "exposure margin from its clients before allowing any trade. Where the margin "
                "collected is short of the required amount, the broker is required to collect the "
                "shortfall before the start of the next trading day.",
            ),
            (
                "3",
                "Peak Margin Reporting",
                "The clearing corporation shall send a minimum of four (4) random snapshots of "
                "client margins during the trading day. The stock broker must maintain evidence "
                "of margin collected corresponding to the peak margin obligation derived from "
                "these snapshots and shall preserve such evidence for a period of five (5) years.",
            ),
            (
                "4",
                "Penalty for Short Collection",
                "A penalty shall be levied on the stock broker for any short collection or "
                "non-collection of margin. The broker is required to reconcile the margin "
                "statements provided by the clearing corporation on a daily basis and must report "
                "any discrepancy within one (1) trading day.",
            ),
            (
                "5",
                "Implementation",
                "The provisions of this circular shall be implemented in a phased manner and shall "
                "be fully effective with effect from December 1, 2024. Stock brokers shall confirm "
                "readiness of their systems to the clearing corporation by November 20, 2024.",
            ),
        ],
    },
]


def get_circular(slug: str) -> dict:
    for c in CIRCULARS:
        if c["slug"] == slug:
            return c
    raise KeyError(slug)
