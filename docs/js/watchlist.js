const WATCHLIST = {
  "MSFT": {
    "name": "Microsoft",
    "sector": "Cloud/AI"
  },
  "AAPL": {
    "name": "Apple",
    "sector": "Consumer Tech"
  },
  "GOOGL": {
    "name": "Alphabet",
    "sector": "Search/Cloud/AI"
  },
  "AMZN": {
    "name": "Amazon",
    "sector": "E-Commerce/Cloud"
  },
  "ADBE": {
    "name": "Adobe",
    "sector": "Creative Software"
  },
  "CRM": {
    "name": "Salesforce",
    "sector": "Enterprise Software"
  },
  "NOW": {
    "name": "ServiceNow",
    "sector": "Enterprise AI"
  },
  "ORCL": {
    "name": "Oracle",
    "sector": "Cloud/Database"
  },
  "INTU": {
    "name": "Intuit",
    "sector": "Financial Software"
  },
  "CDNS": {
    "name": "Cadence Design",
    "sector": "EDA Software"
  },
  "SNPS": {
    "name": "Synopsys",
    "sector": "Chip Design Software"
  },
  "IBM": {
    "name": "IBM",
    "sector": "Enterprise Tech/AI"
  },
  "ACN": {
    "name": "Accenture",
    "sector": "IT Consulting"
  },
  "MDB": {
    "name": "MongoDB",
    "sector": "Cloud Database"
  },
  "TWLO": {
    "name": "Twilio",
    "sector": "Cloud Comms API"
  },
  "NVDA": {
    "name": "Nvidia",
    "sector": "AI Semiconductors"
  },
  "AMD": {
    "name": "AMD",
    "sector": "CPUs/GPUs"
  },
  "AVGO": {
    "name": "Broadcom",
    "sector": "Semiconductors"
  },
  "QCOM": {
    "name": "Qualcomm",
    "sector": "Mobile Chips"
  },
  "TSM": {
    "name": "Taiwan Semiconductor",
    "sector": "Chip Manufacturing"
  },
  "AMAT": {
    "name": "Applied Materials",
    "sector": "Semi Equipment"
  },
  "KLAC": {
    "name": "KLA Corporation",
    "sector": "Process Control"
  },
  "LRCX": {
    "name": "Lam Research",
    "sector": "Etch/Deposition"
  },
  "TXN": {
    "name": "Texas Instruments",
    "sector": "Analog Chips"
  },
  "MU": {
    "name": "Micron Technology",
    "sector": "Memory/Storage"
  },
  "MRVL": {
    "name": "Marvell Technology",
    "sector": "Data Infra Chips"
  },
  "ASML": {
    "name": "ASML Holding",
    "sector": "EUV Lithography"
  },
  "CRWD": {
    "name": "CrowdStrike",
    "sector": "Cybersecurity"
  },
  "PANW": {
    "name": "Palo Alto Networks",
    "sector": "Cybersecurity"
  },
  "ZS": {
    "name": "Zscaler",
    "sector": "Cloud Security"
  },
  "NET": {
    "name": "Cloudflare",
    "sector": "Internet Infra/AI"
  },
  "FTNT": {
    "name": "Fortinet",
    "sector": "Network Security"
  },
  "OKTA": {
    "name": "Okta",
    "sector": "Identity Management"
  },
  "CYBR": {
    "name": "CyberArk",
    "sector": "Privileged Access"
  },
  "SHOP": {
    "name": "Shopify",
    "sector": "E-Commerce Platform"
  },
  "ISRG": {
    "name": "Intuitive Surgical",
    "sector": "Medical Robotics"
  },
  "VRTX": {
    "name": "Vertex Pharma",
    "sector": "Biotech/Gene Therapy"
  },
  "DXCM": {
    "name": "DexCom",
    "sector": "CGM Devices"
  },
  "LLY": {
    "name": "Eli Lilly",
    "sector": "Pharma/GLP-1"
  },
  "NVO": {
    "name": "Novo Nordisk",
    "sector": "Pharma/Diabetes"
  },
  "PODD": {
    "name": "Insulet",
    "sector": "Medical Devices"
  },
  "JNJ": {
    "name": "Johnson & Johnson",
    "sector": "Pharma/MedTech"
  },
  "ABBV": {
    "name": "AbbVie",
    "sector": "Immunology/Oncology"
  },
  "ABT": {
    "name": "Abbott Labs",
    "sector": "Diagnostics/Devices"
  },
  "PFE": {
    "name": "Pfizer",
    "sector": "Pharmaceuticals"
  },
  "REGN": {
    "name": "Regeneron",
    "sector": "Biotech"
  },
  "IDXX": {
    "name": "IDEXX Laboratories",
    "sector": "Veterinary Diagnostics"
  },
  "TMO": {
    "name": "Thermo Fisher",
    "sector": "Life Sciences"
  },
  "TSLA": {
    "name": "Tesla",
    "sector": "EV/Energy/AI"
  },
  "FSLR": {
    "name": "First Solar",
    "sector": "Solar Manufacturing"
  },
  "SEDG": {
    "name": "SolarEdge",
    "sector": "Solar Inverters"
  },
  "BE": {
    "name": "Bloom Energy",
    "sector": "Fuel Cell Technology"
  },
  "RUN": {
    "name": "Sunrun",
    "sector": "Residential Solar"
  },
  "XOM": {
    "name": "ExxonMobil",
    "sector": "Oil & Gas"
  },
  "CVX": {
    "name": "Chevron",
    "sector": "Oil & Gas"
  },
  "COP": {
    "name": "ConocoPhillips",
    "sector": "E&P"
  },
  "HON": {
    "name": "Honeywell",
    "sector": "Industrials/Tech"
  },
  "ITW": {
    "name": "Illinois Tool Works",
    "sector": "Diversified Industrial"
  },
  "PH": {
    "name": "Parker Hannifin",
    "sector": "Motion/Control"
  },
  "ETN": {
    "name": "Eaton Corporation",
    "sector": "Power Management"
  },
  "ROK": {
    "name": "Rockwell Automation",
    "sector": "Industrial Automation"
  },
  "CARR": {
    "name": "Carrier Global",
    "sector": "HVAC/Refrigeration"
  },
  "OTIS": {
    "name": "Otis Worldwide",
    "sector": "Elevators/Escalators"
  },
  "HD": {
    "name": "Home Depot",
    "sector": "Home Improvement"
  },
  "NKE": {
    "name": "Nike",
    "sector": "Consumer/Apparel"
  },
  "LULU": {
    "name": "Lululemon",
    "sector": "Athletic Apparel"
  },
  "DECK": {
    "name": "Deckers Outdoor",
    "sector": "Footwear (UGG/HOKA)"
  },
  "MELI": {
    "name": "MercadoLibre",
    "sector": "LatAm E-Commerce"
  },
  "V": {
    "name": "Visa",
    "sector": "Payments"
  },
  "MA": {
    "name": "Mastercard",
    "sector": "Payments"
  },
  "GPN": {
    "name": "Global Payments",
    "sector": "Payment Tech"
  },
  "BABA": {
    "name": "Alibaba",
    "sector": "China E-Commerce/Cloud"
  },
  "SNOW": {
    "name": "Snowflake",
    "sector": "Cloud Data Platform"
  },
  "DDOG": {
    "name": "Datadog",
    "sector": "Cloud Monitoring"
  },
  "DOCN": {
    "name": "DigitalOcean",
    "sector": "Cloud Platform"
  },
  "PSTG": {
    "name": "Pure Storage",
    "sector": "Flash Storage"
  },
  "NTAP": {
    "name": "NetApp",
    "sector": "Storage Systems"
  },
  "BOX": {
    "name": "Box",
    "sector": "Cloud Storage"
  },
  "CVLT": {
    "name": "CommVault",
    "sector": "Data Protection"
  },
  "HUBS": {
    "name": "HubSpot",
    "sector": "CRM/Marketing"
  },
  "VEEV": {
    "name": "Veeva Systems",
    "sector": "Life Sciences Cloud"
  },
  "ZM": {
    "name": "Zoom Video",
    "sector": "Video Communications"
  },
  "PAYC": {
    "name": "Paycom",
    "sector": "HR Software"
  },
  "PCTY": {
    "name": "Paylocity",
    "sector": "HR Software"
  },
  "MNDY": {
    "name": "Monday.com",
    "sector": "Work OS"
  },
  "APPN": {
    "name": "Appian",
    "sector": "Low-Code Platform"
  },
  "RNG": {
    "name": "RingCentral",
    "sector": "Cloud Communications"
  },
  "JAMF": {
    "name": "Jamf Holding",
    "sector": "Apple Device Mgmt"
  },
  "MANH": {
    "name": "Manhattan Associates",
    "sector": "Supply Chain Software"
  },
  "EPAM": {
    "name": "EPAM Systems",
    "sector": "IT Services"
  },
  "DOCU": {
    "name": "DocuSign",
    "sector": "eSignature"
  },
  "CTSH": {
    "name": "Cognizant",
    "sector": "IT Consulting"
  },
  "GLOB": {
    "name": "Globant",
    "sector": "IT Services"
  },
  "INFY": {
    "name": "Infosys",
    "sector": "IT Services India"
  },
  "WIT": {
    "name": "Wipro",
    "sector": "IT Services India"
  },
  "CSGP": {
    "name": "CoStar Group",
    "sector": "Commercial RE Data"
  },
  "DUOL": {
    "name": "Duolingo",
    "sector": "EdTech"
  },
  "GTLB": {
    "name": "GitLab",
    "sector": "DevOps Platform"
  },
  "CFLT": {
    "name": "Confluent",
    "sector": "Data Streaming"
  },
  "PATH": {
    "name": "UiPath",
    "sector": "RPA Automation"
  },
  "ANET": {
    "name": "Arista Networks",
    "sector": "Cloud Networking"
  },
  "TTD": {
    "name": "The Trade Desk",
    "sector": "Ad Tech Platform"
  },
  "SMCI": {
    "name": "Super Micro Computer",
    "sector": "Server Systems"
  },
  "ENTG": {
    "name": "Entegris",
    "sector": "Semi Materials"
  },
  "ONTO": {
    "name": "Onto Innovation",
    "sector": "Semi Metrology"
  },
  "ACLS": {
    "name": "Axcelis Technologies",
    "sector": "Ion Implant Systems"
  },
  "SWKS": {
    "name": "Skyworks Solutions",
    "sector": "RF Semiconductors"
  },
  "QRVO": {
    "name": "Qorvo",
    "sector": "RF Solutions"
  },
  "RMBS": {
    "name": "Rambus",
    "sector": "Chip Interfaces"
  },
  "AMBA": {
    "name": "Ambarella",
    "sector": "AI Vision Chips"
  },
  "SLAB": {
    "name": "Silicon Laboratories",
    "sector": "IoT Chips"
  },
  "MTSI": {
    "name": "MACOM Technology",
    "sector": "RF/Microwave Chips"
  },
  "POWI": {
    "name": "Power Integrations",
    "sector": "Power Chips"
  },
  "ACMR": {
    "name": "ACM Research",
    "sector": "Wafer Cleaning"
  },
  "EW": {
    "name": "Edwards Lifesciences",
    "sector": "Heart Valve Devices"
  },
  "ALGN": {
    "name": "Align Technology",
    "sector": "Clear Aligners"
  },
  "EXAS": {
    "name": "Exact Sciences",
    "sector": "Cancer Screening"
  },
  "RMD": {
    "name": "ResMed",
    "sector": "Sleep Apnea Devices"
  },
  "STE": {
    "name": "STERIS",
    "sector": "Medical Sterilization"
  },
  "HOLX": {
    "name": "Hologic",
    "sector": "Women's Health"
  },
  "BSX": {
    "name": "Boston Scientific",
    "sector": "Medical Devices"
  },
  "SYK": {
    "name": "Stryker",
    "sector": "Orthopaedic Devices"
  },
  "ZBH": {
    "name": "Zimmer Biomet",
    "sector": "Orthopaedics"
  },
  "ILMN": {
    "name": "Illumina",
    "sector": "Genomic Sequencing"
  },
  "NBIX": {
    "name": "Neurocrine Biosciences",
    "sector": "CNS Therapies"
  },
  "IONS": {
    "name": "Ionis Pharmaceuticals",
    "sector": "RNA Medicines"
  },
  "CRSP": {
    "name": "CRISPR Therapeutics",
    "sector": "Gene Editing"
  },
  "NTLA": {
    "name": "Intellia Therapeutics",
    "sector": "In Vivo Gene Editing"
  },
  "BEAM": {
    "name": "Beam Therapeutics",
    "sector": "Base Editing"
  },
  "ACAD": {
    "name": "Acadia Pharmaceuticals",
    "sector": "CNS Diseases"
  },
  "MRNA": {
    "name": "Moderna",
    "sector": "mRNA Medicines"
  },
  "RXRX": {
    "name": "Recursion Pharma",
    "sector": "AI Drug Discovery"
  },
  "ARRY": {
    "name": "Array Technologies",
    "sector": "Solar Tracking"
  },
  "SHLS": {
    "name": "Shoals Technologies",
    "sector": "Solar BOS"
  },
  "GNRC": {
    "name": "Generac",
    "sector": "Backup Power"
  },
  "ITRI": {
    "name": "Itron",
    "sector": "Smart Metering"
  },
  "KEYS": {
    "name": "Keysight Technologies",
    "sector": "Electronic Test"
  },
  "TRMB": {
    "name": "Trimble",
    "sector": "Positioning Tech"
  },
  "TER": {
    "name": "Teradyne",
    "sector": "Semiconductor Test"
  },
  "MKSI": {
    "name": "MKS Instruments",
    "sector": "Process Control"
  },
  "NOVT": {
    "name": "Novanta",
    "sector": "Precision Medicine Tech"
  },
  "AZTA": {
    "name": "Azenta",
    "sector": "Semi/Life Sci Automation"
  },
  "TTEK": {
    "name": "Tetra Tech",
    "sector": "Environmental Services"
  },
  "ETSY": {
    "name": "Etsy",
    "sector": "Handmade Marketplace"
  },
  "CHWY": {
    "name": "Chewy",
    "sector": "Pet E-Commerce"
  },
  "CPNG": {
    "name": "Coupang",
    "sector": "Korean E-Commerce"
  },
  "GLBE": {
    "name": "Global-E Online",
    "sector": "Cross-Border E-Commerce"
  },
  "ONON": {
    "name": "On Holding",
    "sector": "Premium Running"
  },
  "TPR": {
    "name": "Tapestry",
    "sector": "Luxury Accessories"
  },
  "TMUS": {
    "name": "T-Mobile US",
    "sector": "Wireless Telecom"
  },
  "ERIC": {
    "name": "Ericsson",
    "sector": "Telecom Equipment"
  },
  "NOK": {
    "name": "Nokia",
    "sector": "Telecom Networks"
  },
  "GILD": {
    "name": "Gilead Sciences",
    "sector": "Antiviral/Oncology"
  },
  "BIIB": {
    "name": "Biogen",
    "sector": "CNS Diseases"
  },
  "ALNY": {
    "name": "Alnylam Pharma",
    "sector": "RNA Interference"
  },
  "ALKS": {
    "name": "Alkermes",
    "sector": "CNS/Addiction"
  },
  "SRPT": {
    "name": "Sarepta Therapeutics",
    "sector": "Muscular Dystrophy"
  },
  "RARE": {
    "name": "Ultragenyx",
    "sector": "Rare Diseases"
  },
  "LEGN": {
    "name": "Legend Biotech",
    "sector": "CAR-T Therapy"
  },
  "VKTX": {
    "name": "Viking Therapeutics",
    "sector": "Metabolic Diseases"
  },
  "DNLI": {
    "name": "Denali Therapeutics",
    "sector": "Neurodegeneration"
  },
  "NTRA": {
    "name": "Natera",
    "sector": "Genetic Testing"
  },
  "NVST": {
    "name": "Envista Holdings",
    "sector": "Dental Products"
  },
  "NVCR": {
    "name": "NovoCure",
    "sector": "Tumour Treatment Fields"
  },
  "GKOS": {
    "name": "Glaukos",
    "sector": "Eye Disease"
  },
  "FTV": {
    "name": "Fortive",
    "sector": "Instrumentation"
  },
  "AME": {
    "name": "AMETEK",
    "sector": "Electronic Instruments"
  },
  "ROP": {
    "name": "Roper Technologies",
    "sector": "Diversified Tech"
  },
  "SAP": {
    "name": "SAP SE",
    "sector": "Enterprise Software"
  },
  "CPRT": {
    "name": "Copart",
    "sector": "Vehicle Auctions"
  },
  "ABNB": {
    "name": "Airbnb",
    "sector": "Short-Term Rental"
  },
  "BKNG": {
    "name": "Booking Holdings",
    "sector": "Online Travel"
  },
  "EXPE": {
    "name": "Expedia Group",
    "sector": "Online Travel"
  },
  "AI": {
    "name": "C3.ai",
    "sector": "Enterprise AI"
  },
  "PLTR": {
    "name": "Palantir Technologies",
    "sector": "AI/Analytics Platform"
  },
  "SOUN": {
    "name": "SoundHound AI",
    "sector": "Voice AI"
  },
  "LEVI": {
    "name": "Levi Strauss",
    "sector": "Apparel"
  },
  "PVH": {
    "name": "PVH Corp",
    "sector": "Apparel (Calvin Klein)"
  },
  "RL": {
    "name": "Ralph Lauren",
    "sector": "Luxury Apparel"
  },
  "COLM": {
    "name": "Columbia Sportswear",
    "sector": "Outdoor Apparel"
  },
  "CROX": {
    "name": "Crocs",
    "sector": "Footwear"
  },
  "YETI": {
    "name": "YETI Holdings",
    "sector": "Premium Outdoor Gear"
  },
  "GRMN": {
    "name": "Garmin",
    "sector": "GPS / Wearables"
  },
  "HIMS": {
    "name": "Hims & Hers Health",
    "sector": "Telehealth"
  },
  "PHR": {
    "name": "Phreesia",
    "sector": "Healthcare Admin"
  },
  "OMCL": {
    "name": "Omnicell",
    "sector": "Pharmacy Automation"
  },
  "NEOG": {
    "name": "Neogen",
    "sector": "Food Safety Testing"
  },
  "WDAY": {
    "name": "Workday",
    "sector": "HR/Finance Cloud"
  },
  "PEGA": {
    "name": "Pegasystems",
    "sector": "BPM/Low-Code"
  },
  "AZPN": {
    "name": "AspenTech",
    "sector": "Industrial Software"
  },
  "CDAY": {
    "name": "Ceridian",
    "sector": "HCM Software"
  },
  "FIVN": {
    "name": "Five9",
    "sector": "Cloud Contact Centre"
  },
  "BRZE": {
    "name": "Braze",
    "sector": "Customer Engagement"
  },
  "TOST": {
    "name": "Toast",
    "sector": "Restaurant Tech"
  },
  "MPWR": {
    "name": "Monolithic Power",
    "sector": "Power Management ICs"
  },
  "MEDP": {
    "name": "Medpace Holdings",
    "sector": "Clinical Research Org"
  },
  "ICLR": {
    "name": "ICON plc",
    "sector": "Clinical Research Org"
  },
  "GH": {
    "name": "Guardant Health",
    "sector": "Liquid Biopsy"
  },
  "IRTC": {
    "name": "iRhythm Technologies",
    "sector": "Cardiac Monitoring"
  },
  "INSP": {
    "name": "Inspire Medical",
    "sector": "Sleep Apnea Devices"
  },
  "GEHC": {
    "name": "GE HealthCare",
    "sector": "Imaging/Diagnostics"
  },
  "TMDX": {
    "name": "TransMedics Group",
    "sector": "Organ Transplant Tech"
  },
  "S": {
    "name": "SentinelOne",
    "sector": "Cybersecurity AI"
  },
  "CELH": {
    "name": "Celsius Holdings",
    "sector": "Energy Beverages"
  },
  "MNST": {
    "name": "Monster Beverage",
    "sector": "Energy Drinks"
  },
  "ELF": {
    "name": "e.l.f. Beauty",
    "sector": "Cosmetics"
  },
  "BOOT": {
    "name": "Boot Barn",
    "sector": "Western Wear Retail"
  },
  "BIRK": {
    "name": "Birkenstock",
    "sector": "Footwear"
  },
  "TT": {
    "name": "Trane Technologies",
    "sector": "HVAC/Climate"
  },
  "EMR": {
    "name": "Emerson Electric",
    "sector": "Automation Tech"
  },
  "PCVX": {
    "name": "Vaxcyte",
    "sector": "Vaccine Biotech"
  },
  "KRYS": {
    "name": "Krystal Biotech",
    "sector": "Gene Therapy"
  },
  "ROIV": {
    "name": "Roivant Sciences",
    "sector": "Drug Development"
  }
} ;
const MONITOR_LIST = new Set( ["TWLO", "AI", "AAPL", "SOUN", "CRWD", "BKNG", "ROP", "SHOP", "HIMS", "SMCI", "MA", "SEDG", "BABA", "MRNA", "NET", "TTEK", "ABNB", "TMO", "PLTR", "TMUS", "GOOGL", "AMZN", "RNG", "EXPE"] );
