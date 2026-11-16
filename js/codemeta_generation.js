/**
 * Copyright (C) 2019-2020  The Software Heritage developers
 * See the AUTHORS file at the top-level directory of this distribution
 * License: GNU Affero General Public License version 3, or any later version
 * See top-level LICENSE file for more information
 */

"use strict";

const CODEMETA_CONTEXTS = {
    "2.0": {
        path: "./data/contexts/codemeta-2.0.jsonld",
        url: "https://doi.org/10.5063/schema/codemeta-2.0"
    },
    "3.0": {
    path: "./data/contexts/codemeta-3.0.jsonld",
    url: "https://w3id.org/codemeta/3.0"
    },
    "3.1": {
        path: "./data/contexts/codemeta-3.0.jsonld",
        url: "https://w3id.org/codemeta/3.1"
    },
    "4.0": { 
        path: "./data/contexts/codemeta-4.0.jsonld", 
        url: "https://w3id.org/codemeta/4.0" 
    }
}

const SPDX_PREFIX = 'https://spdx.org/licenses/';

const loadContextData = async () => {
    const [contextV2, contextV3, contextV4] =
        await Promise.all([
            fetch(CODEMETA_CONTEXTS["2.0"].path).then(response => response.json()),
            fetch(CODEMETA_CONTEXTS["3.1"].path).then(response => response.json()),
            fetch(CODEMETA_CONTEXTS["4.0"].path).then(response => response.json()),
        ]);

        contextV3["@context"]["id"] = "@id";
        contextV3["@context"]["type"] = "@type";
        contextV2["@context"]["author"] = {"@id": "schema:author", "@container": "@list"};
        contextV3["@context"]["author"] = {"@id": "schema:author", "@container": "@list"};
        contextV2["@context"]["keywords"] = {"@id": "schema:keywords", "@container": "@list"};
        contextV3["@context"]["keywords"] = {"@id": "schema:keywords", "@container": "@list"};
        contextV4["@context"]["keywords"] = {"@id": "schema:keywords", "@container": "@list"};
        contextV2["@context"]["softwareRequirements"] = {"@id": "schema:softwareRequirements", "@container": "@list"};
        contextV3["@context"]["softwareRequirements"] = {"@id": "schema:softwareRequirements", "@container": "@list"};
        contextV4["@context"]["softwareRequirements"] = {"@id": "schema:softwareRequirements", "@container": "@list"};
        contextV4["@context"]["archivedAt"] = {"@id": "schema:archivedAt", "@type": "@id", "@container": "@set"};
        contextV4["@context"]["featureList"] = {"@id": "schema:featureList", "@container": "@set"};
        contextV2["@context"]["id"] = "@id";
        contextV2["@context"]["type"] = "@type";
    return {
        [CODEMETA_CONTEXTS["2.0"].url]: contextV2,
        [CODEMETA_CONTEXTS["3.0"].url]: contextV3,
        [CODEMETA_CONTEXTS["3.1"].url]: contextV3,
        [CODEMETA_CONTEXTS["4.0"].url]: contextV4,
    }
}

const getJsonldCustomLoader = contexts => {
    return url => {
        const xhrDocumentLoader = jsonld.documentLoaders.xhr();
        if (url in contexts) {
            return {
                contextUrl: null,
                document: contexts[url],
                documentUrl: url
            };
        }
        return xhrDocumentLoader(url);
    }
};

const initJsonldLoader = contexts => {
    jsonld.documentLoader = getJsonldCustomLoader(contexts);
};

const getAllCodemetaContextUrls = () => {
    return Object.values(CODEMETA_CONTEXTS).map(context => context.url);
}

const getContextUrlsForVersion = (version) => {
    if (version === "4.0") {
        return [CODEMETA_CONTEXTS["4.0"].url];
    }
    return [
        CODEMETA_CONTEXTS["2.0"].url,
        CODEMETA_CONTEXTS["3.0"].url
    ];
}
const getCodemetaVersionFromDoc = (doc) => {
    const context = doc["@context"];
    const urls = Array.isArray(context) ? context : [context];
    const isV4 = urls.some(url =>
        typeof url === "string" &&
        url.startsWith(CODEMETA_CONTEXTS["4.0"].url)
    );
    return isV4 ? "4.0" : "3.0";
}

function emptyToUndefined(v) {
    if (v == null || v == "")
        return undefined;
    else
        return v;
}

function getIfSet(query) {
    return emptyToUndefined(document.querySelector(query).value);
}

function setIfDefined(query, value) {
    if (value !== undefined) {       
        document.querySelector(query).value = value;
    }
}

function getSelectedTypeAuthor(prefix) {
    const selectElement = document.querySelector(`#${prefix}_type`);
    return selectElement ? selectElement.value : undefined;
}

function getLicenses() {
    let selectedLicenses = Array.from(document.getElementById("selected-licenses").children);
    return selectedLicenses.map(licenseDiv => SPDX_PREFIX + licenseDiv.children[0].innerText);
}

// Names of codemeta properties with a matching HTML field name
const directCodemetaFields = [
    'codeRepository',
    'contIntegration',
    'dateCreated',
    'datePublished',
    'dateModified',
    'downloadUrl',
    'issueTracker',
    'name',
    'version',
    'description',
    'creditText',
    'citeAsID',
    'applicationCategory',
    'releaseNotes',
    'funding',
    'developmentStatus',
    'isSourceCodeOf',
    'isPartOf'
    // ,
    // 'referencePublication'
];

const splittedCodemetaFields = [
    ['keywords', ','],
    ['programmingLanguage', ','],
    ['runtimePlatform', ','],
    ['operatingSystem', ','],
    // ['softwareRequirements', '\n'],
    // ['softwareRequirements', ','],
    ['relatedLink', '\n'],
    ['identifier', ','],
    ['alternateName', '\n'],
    ['archivedAt', '\n']
]

// Names of codemeta properties with a matching HTML field name,
// in a Person object
const directPersonCodemetaFields = [
    'givenName',
    'familyName',
    'name',
    'email',
    'affiliation',
    'identifier'
];

const directOrganizationCodemetaFields = [
    'name',
    'email'
];

const directRoleCodemetaFields = [
    'roleName',
    'startDate',
    'endDate',
];

const directReviewCodemetaFields = [
    // 'reviewAspect',
    // 'reviewBody',
    'referencePublicationUrl',
    'publicationTitle',
    'publicationDOI',
    "issn",
    "publicationDatePublished"
    // ,
    // "author"

];

const crossCodemetaFields = {
    "contIntegration": ["continuousIntegration"],
    // "embargoDate": ["embargoDate", "embargoEndDate"], Not present in the form yet TODO ?
};

function generateBlankNodeId(customId) {
    return `_:${customId}`;
}

function generateShortOrg(fieldName) {
    var affiliation = getIfSet(fieldName);
    if (affiliation !== undefined) {
        if (isUrl(affiliation)) {
            return {
                "@type": "Organization",
                "@id": affiliation,
            };
        }
        else {
            return {
                "@type": "Organization",
                "name": affiliation,
            };
        }
    }
    else {
        return undefined;
    }
}

function generatePerson(idPrefix) {

    var doc = {
        "@type": getSelectedTypeAuthor(idPrefix) || "Person", // Use the selection or ‘Person’ by default.
    }
    const id = getIfSet(`#${idPrefix}_id`);

    // if (id !== undefined)
    doc["@id"] = id ? id : generateBlankNodeId(idPrefix);

    if (doc["@type"] == "Person") {

        directPersonCodemetaFields.forEach(function (item, index) {
            doc[item] = getIfSet(`#${idPrefix}_${item}`);
        });
        doc["affiliation"] = generateShortOrg(`#${idPrefix}_affiliation`);
    } else {
        directOrganizationCodemetaFields.forEach(function (item, index) {
            doc[item] = getIfSet(`#${idPrefix}_${item}`);
        });
    }
    return doc;
}

function generateKeyword(idPrefix) {

    const name = getIfSet(`#${idPrefix}_name`);
    const id = getIfSet(`#${idPrefix}_id`);

    if (!name && !id) {
        return undefined; 
    }

    if (name && id) {
        return {
            "@type": "DefinedTerm",
            "name": name,
            "@id": id
        };
    }

    if (id) {
        return {
            "@type": "URL",
            "@id": id
        };
    }

    return name;
}

function generateFeatureList() {
    var features = [];
    var nbFeatures = getNbFeatures();

    for (let featureId = 1; featureId <= nbFeatures; featureId++) {
        const feature = getIfSet(`#featureList_${featureId}_text`);
        if (feature !== undefined) {
            features.push(feature);
        }
    }
    return features;
}

function generateRole(id) {
    const doc = {
        "@type": "Role"
    };

    if (id.includes("_reference_")) {
        doc['roleName'] = getIfSet(`#${id} .${'roleName'}`);
    }else {    
        directRoleCodemetaFields.forEach(function (item, index) {
            doc[item] = getIfSet(`#${id} .${item}`);
        });
    }  
    return doc;
}

function generateRoles(property, idPrefix, person) {
    const roles = [];
    const roleNodes = document.querySelectorAll(`ul[id^=${idPrefix}_role_`);
    roleNodes.forEach(roleNode => {
        const role = generateRole(roleNode.id);
        role[`schema:${property}`] = getDocumentId(person); // Prefix with "schema:" to prevent it from expanding into a list
        roles.push(role);
    });
    return roles;
}

function generatePersons(property) {
    var persons = [];
    var nbPersons = getNbPersons(property);

    for (let personId = 1; personId <= nbPersons; personId++) {
        const idPrefix = `${property}_${personId}`;
        const person = generatePerson(idPrefix);
        persons.push(person);
        const roles = generateRoles(property, idPrefix, person);
        if (roles.length > 0) {
            persons = persons.concat(roles);
        }
    }

    return persons;
}
function generateKeywords() {
    var keywords = [];
    var nbKeywords = getNbKeywords();

    for (let keywordId = 1; keywordId <= nbKeywords; keywordId++) {
        const idPrefix = `keyword_${keywordId}`;
        const keyword = generateKeyword(idPrefix);
        if (keyword !== undefined) { 
            keywords.push(keyword);
        }
    }
    return keywords;
}

function generateSoftwareRequirements() {
    var softwareRequirements = [];
    var tableBody = document.querySelector("#softwareRequirements tbody");
    var rows = tableBody.querySelectorAll("tr"); 

    rows.forEach(row => {
        const requirement = generateSoftwareRequirement(row);
        if (requirement !== undefined) { 
            softwareRequirements.push(requirement);
        }
    });

    return Array.isArray(softwareRequirements) ? softwareRequirements : [softwareRequirements];
}

// function getNbRequirements() {
//     var tableBody = document.querySelector("#softwareRequirements tbody");
//     var rowCount = tableBody.querySelectorAll("tr").length;
//     return rowCount;
// }

function generateSoftwareRequirement(row) {
    const cells = row.getElementsByTagName("td");
    
    if (cells.length < 2) return undefined; 
    
    const name = cells[0].querySelector("input")?.value.trim();
    const version = cells[1].querySelector("input")?.value.trim();
    
    if (!name && !version) {
        return undefined;
    }

    const doc = { "@type": "SoftwareApplication" };
    if (name) doc["name"] = name;
    if (version) doc["version"] = version;

    return doc;
}

function generateReferencePublications() {

    var publications = [];
    var nbPublications = getNbReferencePublications();
    for (let pubId = 1; pubId <= nbPublications; pubId++) {
        const publication = generateReferencePublication(pubId);
        if (publication.identifier || publication.url || publication.name || publication.datePublished || publications.issn || publications.author) {
            publications.push(publication);
        }
    }
    return publications;
}
function generateReferencePublication(pubId) {
    var doc = {
        "@type": "ScholarlyArticle"
    };

    doc["identifier"] = getIfSet(`#publicationDOI`);
    doc["url"] = getIfSet(`#referencePublicationUrl`);
    doc["name"] = getIfSet(`#publicationTitle`);
    doc["datePublished"] = getIfSet(`#publicationDatePublished`);
    doc["issn"] = getIfSet(`#issn`);
    var authors = generatePersons('author_reference');
    if (authors.length > 0) {
        doc["author"] = authors;
    }
    return doc;
}
function getNbReferencePublications() {
    //TODO: review this count when add more referencePublications. Right now is just one
    return document.querySelectorAll('[id^="referencePublication_"]').length || 1 ;
}
function generateReview() {
    const doc = {
        "@type": "Review"
    };
    directReviewCodemetaFields.forEach(function (item, index) {
        doc[item] = getIfSet(`#${item}`);
    });
    return doc;
}

async function buildExpandedDocWithAllContexts(codemetaVersion) {
    var doc = {
        "@context": getContextUrlsForVersion(codemetaVersion),
        "@type": "SoftwareSourceCode"
    };

    let licenses = getLicenses();
    if (licenses.length > 0) {
        doc["license"] = licenses;
    }

    // Generate most fields
    directCodemetaFields.forEach(function (item, index) {
        doc[item] = getIfSet('#' + item)
    });

    doc["funder"] = generateShortOrg('#funder', doc["affiliation"]);

    // const review = generateReview();
    // if (review["reviewAspect"] || review["reviewBody"] || review["publicationTitle"]) {
    //     doc["review"] = generateReview();
    // }
    var referencePublications = generateReferencePublications();
    if (referencePublications.length > 0) {
        doc["referencePublication"] = referencePublications;
    }

    var citeWith = generateCiteWith();
    if (citeWith.length > 0) {
        doc["citeWith"] = citeWith;
    }

    // Generate simple fields parsed simply by splitting
    splittedCodemetaFields.forEach(function (item, index) {
        const id = item[0];
        const separator = item[1];
        const value = getIfSet('#' + id);
        if (value !== undefined) {
            doc[id] = value.split(separator).map(trimSpaces).filter(s => s.length > 0);
        }
    });

    // Generate dynamic fields
    var authors = generatePersons('author');
    if (authors.length > 0) {
        doc["author"] = authors;
    }
    var contributors = generatePersons('contributor');
    if (contributors.length > 0) {
        doc["contributor"] = contributors;
    }  
    var keywords = generateKeywords();
    if (keywords.length > 0) {
        doc["keywords"] = keywords;
    }
    var featureList = generateFeatureList();
   if (featureList.length > 0) {
       doc["featureList"] = featureList;
   }
    var maintainers = generateMaintainers();
    if (maintainers.length > 0) {
        doc["maintainer"] = maintainers;
    }
    var softwareRequirements = generateSoftwareRequirements();
    if (softwareRequirements.length > 0) {
        doc["softwareRequirements"] = [...softwareRequirements];
    } 
    for (const [key, items] of Object.entries(crossCodemetaFields)) {
        items.forEach(item => {
           doc[item] = doc[key]; 
        }); 
    }

    return await jsonld.expand(doc);
}


function transformIdAndType(obj) {
    if (obj && typeof obj === 'object') {
        if (obj.id) {
            obj["@id"] = obj.id;
            delete obj.id;
        }
        if (obj.type) {
            obj["@type"] = obj.type;
            delete obj.type;
        }
        for (const key in obj) {
            transformIdAndType(obj[key]);
        }
    } else if (Array.isArray(obj)) {
        obj.forEach(transformIdAndType); 
    }
}

let generationToken = 0;
// change to v4.0 as default
async function generateCodemeta(codemetaVersion = "4.0") {
     if (skipAutoGenerate) return;
     
    const token = ++generationToken;
    var inputForm = document.querySelector('#inputForm');
    var codemetaText, errorHTML;
    if (inputForm.checkValidity()) {
        // Expand document with all contexts before compacting
        // to allow generating property from any context
        const expanded = await buildExpandedDocWithAllContexts(codemetaVersion);
        if (token !== generationToken) return;

        const compacted = await jsonld.compact(expanded, CODEMETA_CONTEXTS[codemetaVersion].url);
        if (token !== generationToken) return;
        
        transformIdAndType(compacted);
        compacted["@type"] = ["SoftwareSourceCode", "SoftwareApplication"];

        // if (codemetaVersion === "3.0") {
        if (codemetaVersion.startsWith("3.")) {
            delete compacted['codemeta:contIntegration'];
        } else if (codemetaVersion === "2.0") {
            delete compacted['codemeta:continuousIntegration'];
        }

        const ordered = {};
        ordered["@context"] = compacted["@context"];
        ordered["@type"] = compacted["@type"];
        for (const key of Object.keys(compacted)) {
            if (key !== "@context" && key !== "@type") {
                ordered[key] = compacted[key];
            }
        }
        codemetaText = JSON.stringify(ordered, null, 4);
        // codemetaText = JSON.stringify(compacted, null, 4);
        errorHTML = "";
    }
    else {
        // var invalidFields = inputForm.querySelectorAll(':invalid');
        // invalidFields.forEach(function(field) {
        //     console.log(field.name + ": " + field.validationMessage);
        // });
        codemetaText = "";
        errorHTML = "invalid input (see error above)";
        inputForm.reportValidity();
    }

    document.querySelector('#codemetaText').innerText = codemetaText;
    setError(errorHTML);


    // Run validator on the exported value, for extra validation.
    // If this finds a validation, it means there is a bug in our code (either
    // generation or validation), and the generation MUST NOT generate an
    // invalid codemeta file, regardless of user input.

    if (codemetaText && !validateDocument(JSON.parse(codemetaText))) {
        alert('Bug detected! The data you wrote is correct; but for some reason, it seems we generated an invalid codemeta.json. Please report this bug at https://github.com/codemeta/codemeta-generator/issues/new and copy-paste the generated codemeta.json file. Thanks!');
    }

    if (codemetaText) {
        // For restoring the form state on page reload
        sessionStorage.setItem('codemetaText', codemetaText);
    }
}

// Generates a schema.org JSON-LD snippet from the information provided in the form.
async function generateSchemaOrg() {

    //same code as -gc flag (google complaint) in somef.
    if (skipAutoGenerate) return;

    // get codemeta 3
    await generateCodemeta("3.0");
    const text = document.querySelector('#codemetaText').innerText;
    if (!text) return;

    const doc = JSON.parse(text);

    // change context
    doc["@context"] = {
        "@vocab": "https://schema.org/",
        "codemeta": "https://w3id.org/codemeta/3.0/"
    };


    //list
    for (const prop of ["author", "contributor", "editor"]) {
        if (Array.isArray(doc[prop])) {
            doc[prop] = {"@list": doc[prop]};
        }
    }
    if (doc["referencePublication"]) {
        doc["referencePublication"].forEach(pub => {
            if (Array.isArray(pub.author)) {
                pub.author = {"@list": pub.author};
            }
        });
    }

    // no schema.org equivalent for these properties, so we prefix them with codemeta
    const SCHEMA_ORG = new Set([
        "@type", "name", "description", "author", "keywords",
        "license", "url", "identifier", "programmingLanguage",
        "releaseNotes", "releaseDate"
    ]);
    for (const key of Object.keys(doc)) {
        if (!SCHEMA_ORG.has(key) && key !== "@context") {
            doc[`codemeta:${key}`] = doc[key];
            delete doc[key];
        }
    }

    if (typeof doc["keywords"] === "string") {
        doc["keywords"] = doc["keywords"].split(",").map(s => s.trim()).filter(Boolean);
    }

    if (Array.isArray(doc["codemeta:softwareRequirements"])) {
        doc["codemeta:softwareRequirements"] = doc["codemeta:softwareRequirements"]
            .filter(r => typeof r === "object" && r !== null);
    }

    if (typeof doc["codemeta:developmentStatus"] === "string") {
        doc["codemeta:developmentStatus"] = doc["codemeta:developmentStatus"]
            .charAt(0).toUpperCase() + doc["codemeta:developmentStatus"].slice(1);
    }

    document.querySelector('#codemetaText').innerText = JSON.stringify(doc, null, 4);
    setError("");
}

// Imports a single field (name or @id) from an Organization.
function importShortOrg(fieldName, doc) {
    if (doc !== undefined) {
        // Use @id if set, else use name
        setIfDefined(fieldName, doc["name"]);
        setIfDefined(fieldName, getDocumentId(doc));
    }
}

function importReview(doc) {
    if (doc !== undefined) {
        directReviewCodemetaFields.forEach(item => {
            setIfDefined('#' + item, doc[item]);
        });
    }
}

function authorsEqual(author1, author2) {
    const id1 = typeof author1 === "string"? author1 : getDocumentId(author1);
    const id2 = typeof author2 === "string"? author2 : getDocumentId(author2);
    if (id1 || id2) {
        // Use their id if both authors have one
        return id1 === id2;
    }
    // Fall back to comparing values otherwise
    return author1.givenName === author2.givenName
        && author1.familyName === author2.familyName
        && author1.email === author2.email;
}

function getSingleAuthorsFromRoles(docs) {
    return docs.filter(doc => getDocumentType(doc) === "Role")
        .map(doc => doc["schema:author"])
        .reduce((authorSet, currentAuthor) => {
            const foundAuthor = authorSet.find(author => authorsEqual(author, currentAuthor));
            if (!foundAuthor) {
                return authorSet.concat([currentAuthor]);
            } else {
                return authorSet;
            }
        }, []);
}

function importRoles(personPrefix, roles) {
    roles.forEach(role => {
        const roleId = addRole(`${personPrefix}`);

        if (personPrefix.includes("_reference_")) {
            setIfDefined(`#${personPrefix}_${'roleName'}_${roleId}`, role['roleName']);
        }else {    
            directRoleCodemetaFields.forEach(item => {
                setIfDefined(`#${personPrefix}_${item}_${roleId}`, role[item]);
            });
        }  
    });
}

function importKeywords(keywords) {
    if (keywords === undefined) {
        return;
    }
    keywords.forEach((keyword, index) => {
        const keywordId = addKeyword();
        const keywordPrefix = `keyword_${keywordId}`;

        if (typeof keyword === 'string') {
            document.querySelector(`#${keywordPrefix}_name`).value = keyword;
        } else if (typeof keyword === 'object' && keyword['@type'] === 'DefinedTerm') {
            document.querySelector(`#${keywordPrefix}_id`).value = keyword['@id'] || '';
            document.querySelector(`#${keywordPrefix}_name`).value = keyword.name || '';
        } else if (typeof keyword === 'object' && keyword['@type'] === 'URL') {
            document.querySelector(`#${keywordPrefix}_id`).value = keyword['@id'] || '';
        }

    });
}

function importFeatureList(features) {
    if (features === undefined) {
        return;
    }
    const featureList = Array.isArray(features) ? features : [features];

    featureList.forEach(function (feature) {
        if (feature === undefined || feature === null) {
            return;
        }
        if (typeof feature === 'object') {
            feature = feature['@id'] || feature.url || feature.name;
        }
        if (!feature) {
            return;
        }
        const featureId = addFeature();
        setIfDefined(`#featureList_${featureId}_text`, feature);
    });
}

function importRequirements(requirements) {
    console.log('importRequirements - received:', requirements.length, 'items');
    if (requirements === undefined) {
        return;
    }
    const requirementsArray = Array.isArray(requirements) ? requirements : [requirements];

    requirementsArray.forEach((req) => {
        let name = "";
        let version = "";
        if (typeof req === "string") {
            name = req;
        } else {
            name = req.name ? req.name : "";
            version = req.version ? req.version : "";
        }
        addRowRequirements(name, version);
    });
}

function importPersons(prefix, legend, docs) {
    if (docs === undefined) {
        return;
    }
    // const authors = docs.filter(doc => getDocumentType(doc) === "Person");
    const authors = docs.filter(doc => {
        const type = getDocumentType(doc);
        // return (type === "Person" || type === "Organization") && doc.id;
        return (type === "Person" || type === "Organization");
    });

    if (authors.length == 0 ) 
        return;

    const authorsFromRoles = getSingleAuthorsFromRoles(docs);
    const allAuthorDocs = authors.concat(authorsFromRoles)
        .reduce((authors, currentAuthor) => {
            if (!authors.find(author => authorsEqual(author, currentAuthor))) {
                authors.push(currentAuthor);
            }
            return authors;
        }, []);
     
    if (allAuthorDocs.length > 0 ) {
        allAuthorDocs.forEach(function (doc, index) {
            var personId = addPerson(prefix, legend);
            const authorType = getDocumentType(doc) || 'Person'; 
            const personPrefix = `${prefix}_${personId}`;
            const typeSelect = document.querySelector(`#${personPrefix}_type`);
    
            if (typeSelect)
                typeSelect.value = authorType;
    
            if (!isBlankNodeId(getDocumentId(doc))) {
                setIfDefined(`#${prefix}_${personId}_id`, getDocumentId(doc));
            }
            directPersonCodemetaFields.forEach(function (item, index) {
                setIfDefined(`#${prefix}_${personId}_${item}`, doc[item]);
            });
    
            importShortOrg(`#${prefix}_${personId}_affiliation`, doc['affiliation']);
            
            const roles = docs
                .filter(currentDoc => getDocumentType(currentDoc) === "Role")
                .filter(currentDoc => authorsEqual(currentDoc["schema:author"], doc));

            importRoles(`${prefix}_${personId}`, roles);
    
            toggleAuthorType(personPrefix);
        });
    }

}

async function recompactDocWithAllContexts(doc) {
    // const allContexts = getAllCodemetaContextUrls();
    const version = getCodemetaVersionFromDoc(doc);
    const contexts = getContextUrlsForVersion(version);
    const newDoc = structuredClone(doc);
    newDoc["@context"] = contexts;
    const expanded = await jsonld.expand(newDoc);
    const compacted = await jsonld.compact(expanded, contexts);
    return compacted;
}

async function importCodemeta() {
    var inputForm = document.querySelector('#inputForm');
    var doc = parseAndValidateCodemeta(false);

    // Re-compact document with all contexts
    // to allow importing property from any context
    skipAutoGenerate = true; 
    doc = await recompactDocWithAllContexts(doc);
  
    resetForm();

    if (doc['license'] !== undefined) {
        if (typeof doc['license'] === 'string') {
            doc['license'] = [doc['license']];
        }

        doc['license'].forEach(l => {
            if (l.indexOf(SPDX_PREFIX) !== 0) { return; }
            let licenseId = l.substring(SPDX_PREFIX.length);
            insertLicenseElement(licenseId);
        });
    }

    directCodemetaFields.forEach(function (item, index) {
        setIfDefined('#' + item, doc[item]);
    });

    // creditText may arrive as an array from somef
    if (doc['creditText'] !== undefined) {
        setIfDefined('#creditText', Array.isArray(doc['creditText'])
            ? doc['creditText'].join('\n')
            : doc['creditText']);
    }

     // featureList may arrive as an array from somef
    if (doc['featureList'] !== undefined) {
         importFeatureList(doc['featureList']);
     }

    if (doc['citeAsID'] !== undefined) {
        setIfDefined('#citeAsID', Array.isArray(doc['citeAsID'])
            ? doc['citeAsID'].join('\n')
            : doc['citeAsID']);
    }

    importShortOrg('#funder', doc["funder"]);
    // importReview(doc["review"]);

    // Import simple fields by joining on their separator
    splittedCodemetaFields.forEach(function (item, index) {
        const id = item[0];
        const separator = item[1];
        let value = doc[id];
        if (value !== undefined) {
            if (Array.isArray(value)) {
                value = value.join(separator);
            }
            setIfDefined('#' + id, value);
        }
    });

    // for (const [key, items] of Object.entries(crossCodemetaFields)) {
    //     let value = "";
    //     items.forEach(item => {
    //        value = doc[item] || value;
    //     });
    //     setIfDefined(`#${key}`, value);
    // }
    setIfDefined('#contIntegration', doc['continuousIntegration'] || doc['contIntegration']);

    importPersons('author', 'Author', doc['author']);
  
    if (doc['keywords']) {
        if (typeof doc['keywords'] === 'string') {
            metadata.keywords = doc['keywords'].split(',').map(k => k.trim());
        } else if (!Array.isArray(doc['keywords'])) {
            metadata.keywords = [];
        }
        importKeywords(doc['keywords']);
    }
    if (doc['maintainer']) {
        const maintainers = Array.isArray(doc['maintainer']) ? doc['maintainer'] : [doc['maintainer']];
        importMaintainers(maintainers);
    }
    if (doc['contributor']) {
        // If only one contributor, it is compacted to an object
        const contributors = Array.isArray(doc['contributor'])? doc['contributor'] : [doc['contributor']];
        importPersons('contributor', 'Contributor', contributors);
    }
    if (doc['referencePublication']) {
        importReferencePublication(doc['referencePublication']);
    }

     if (doc['citeWith']) {
        importCiteWith(doc['citeWith']);
    }
    if (doc['softwareRequirements']) {
        importRequirements(doc['softwareRequirements'])
    }

    skipAutoGenerate = false; 

}

function importReferencePublication(references) {
    if (references === undefined) {
        return;
    }
    const referenceList = Array.isArray(references) ? references : [references];
    if (referenceList.length === 0) {
        return;
    }
    const reference = referenceList[0];
    
    document.querySelector(`#referencePublicationUrl`).value = reference['@id'] || reference.url || '';
    document.querySelector(`#publicationTitle`).value = reference.name || '';
    document.querySelector(`#publicationDOI`).value =
        Array.isArray(reference.identifier)
        ? reference.identifier.join(', ')
        : (reference.identifier || '');
    document.querySelector(`#publicationDatePublished`).value = reference.datePublished || '';
    document.querySelector(`#issn`).value = reference.issn || '';
       
    if (reference.author && reference.author.length > 0) {         
        importPersons('author_reference', 'Author_ref', reference.author);
    }
}

function loadStateFromStorage() {
    var codemetaText = sessionStorage.getItem('codemetaText')
    if (codemetaText) {
        document.querySelector('#codemetaText').innerText = codemetaText;
        importCodemeta();
    }
}

function downloadCodemeta() {
    const codemetaText = document.querySelector('#codemetaText').innerText;
    const blob = new Blob([codemetaText], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    document.querySelector('#downloadCodemeta').href = url;
    document.querySelector('#downloadCodemeta').download = "codemeta.json";
    URL.revokeObjectURL(url);
}

function generateMaintainer(idPrefix) {
    const name = getIfSet(`#${idPrefix}_name`);
    const identifier = getIfSet(`#${idPrefix}_identifier`);
    const email = getIfSet(`#${idPrefix}_email`);

    if (!name && !identifier && !email) return undefined;

    var doc = { "@type": "Person" };
    if (name) doc["name"] = name;
    if (identifier) doc["identifier"] = identifier;
    if (email) doc["email"] = email;
    return doc;
}

function generateMaintainers() {
    var maintainers = [];
    var nb = getNbMaintainers();
    for (let id = 1; id <= nb; id++) {
        const m = generateMaintainer(`maintainer_${id}`);
        if (m !== undefined) maintainers.push(m);
    }
    return maintainers;
}

function importMaintainers(maintainers) {
    if (maintainers === undefined) return;
    maintainers.forEach((m) => {
        const id = addMaintainer();
        const prefix = `maintainer_${id}`;
        const person = m['@type'] === 'Person' ? m : m;  // both cases same handler
        document.querySelector(`#${prefix}_name`).value = person.name || '';
        document.querySelector(`#${prefix}_identifier`).value = person.identifier || '';
        document.querySelector(`#${prefix}_email`).value = person.email || '';
    });
}


function generateCiteWith() {
    var works = [];
    var nbWorks = getNbCiteWiths();
    for (let workId = 1; workId <= nbWorks; workId++) {
        const work = generateCiteWithWork(workId);
        if (work !== undefined) {
            works.push(work);
        }
    }
    return works;
}

function generateCiteWithWork(workId) {
    const prefix = `citeWith_${workId}`;
    const identifier = getIfSet(`#${prefix}_identifier`);
    const url = getIfSet(`#${prefix}_url`);
    const name = getIfSet(`#${prefix}_name`);
    const datePublished = getIfSet(`#${prefix}_datePublished`);
    const authors = generatePersons(`${prefix}_author`);

    // somef omits @id for authors without a real URI; do the same
    authors.forEach(function (author) {
        if (isBlankNodeId(author["@id"])) {
            delete author["@id"];
        }
    });

    if (!identifier && !url && !name && !datePublished && authors.length === 0) {
        return undefined;
    }

    const doc = {
        "@type": getIfSet(`#${prefix}_type`) || "ScholarlyArticle"
    };

    if (identifier) doc["identifier"] = identifier;
    if (url) doc["url"] = url;
    if (name) doc["name"] = name;
    if (datePublished) doc["datePublished"] = datePublished;
    if (authors.length > 0) doc["author"] = authors;

    return doc;
}

function importCiteWith(works) {
    if (works === undefined) {
        return;
    }
    const workList = Array.isArray(works) ? works : [works];

    workList.forEach(function (work) {
        if (typeof work === 'string') {
            work = isUrl(work)
                ? { "@type": "ScholarlyArticle", url: work }
                : { "@type": "ScholarlyArticle", identifier: work };
        }

        const workId = addCiteWith();
        const prefix = `citeWith_${workId}`;

        const typeSelect = document.querySelector(`#${prefix}_type`);
        const type = getDocumentType(work) || 'ScholarlyArticle';
        if (!Array.from(typeSelect.options).some(option => option.value === type)) {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
        }
        typeSelect.value = type;

        setIfDefined(`#${prefix}_identifier`, Array.isArray(work.identifier)
            ? work.identifier.join(', ')
            : work.identifier);
        setIfDefined(`#${prefix}_url`, work.url);
        setIfDefined(`#${prefix}_name`, work.name);
        setIfDefined(`#${prefix}_datePublished`, work.datePublished);

        if (work.author) {
            const authors = Array.isArray(work.author) ? work.author : [work.author];
            importPersons(`${prefix}_author`, 'Author', authors);
        }
    });
}