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
    }
}

const SPDX_PREFIX = 'https://spdx.org/licenses/';

const loadContextData = async () => {
    const [contextV2, contextV3] =
        await Promise.all([
            fetch(CODEMETA_CONTEXTS["2.0"].path).then(response => response.json()),
            fetch(CODEMETA_CONTEXTS["3.0"].path).then(response => response.json())
        ]);

        contextV3["@context"]["id"] = "@id";
        contextV3["@context"]["type"] = "@type";
        contextV2["@context"]["author"] = {"@id": "schema:author", "@container": "@list"};
        contextV3["@context"]["author"] = {"@id": "schema:author", "@container": "@list"};
        contextV2["@context"]["keywords"] = {"@id": "schema:keywords", "@container": "@list"};
        contextV3["@context"]["keywords"] = {"@id": "schema:keywords", "@container": "@list"};
        contextV2["@context"]["softwareRequirements"] = {"@id": "schema:softwareRequirements", "@container": "@list"};
        contextV3["@context"]["softwareRequirements"] = {"@id": "schema:softwareRequirements", "@container": "@list"};
        contextV2["@context"]["id"] = "@id";
        contextV2["@context"]["type"] = "@type";
    return {
        [CODEMETA_CONTEXTS["2.0"].url]: contextV2,
        [CODEMETA_CONTEXTS["3.0"].url]: contextV3
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
    'identifier',
    'description',
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
]

// Names of codemeta properties with a matching HTML field name,
// in a Person object
const directPersonCodemetaFields = [
    'givenName',
    'familyName',
    'email',
    'affiliation',
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
    "contIntegration": ["contIntegration", "continuousIntegration"],
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

    if (id !== undefined)
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

    if (name && version) {
        return {
            "name": name,
            "version": version
        };
    }

    return name || version;
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

async function buildExpandedDocWithAllContexts() {
    var doc = {
        "@context": getAllCodemetaContextUrls(),
        "@type": "SoftwareSourceCode",
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
    // Generate simple fields parsed simply by splitting
    splittedCodemetaFields.forEach(function (item, index) {
        const id = item[0];
        const separator = item[1];
        const value = getIfSet('#' + id);
        if (value !== undefined) {
            doc[id] = value.split(separator).map(trimSpaces);
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

// change to v3.0 as default
async function generateCodemeta(codemetaVersion = "3.0") {

    var inputForm = document.querySelector('#inputForm');
    var codemetaText, errorHTML;
    if (inputForm.checkValidity()) {
        // Expand document with all contexts before compacting
        // to allow generating property from any context
        const expanded = await buildExpandedDocWithAllContexts();

        const compacted = await jsonld.compact(expanded, CODEMETA_CONTEXTS[codemetaVersion].url);

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

        transformIdAndType(compacted);
        codemetaText = JSON.stringify(compacted, null, 4);
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

function importRequirements(requirements) {
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
        return (type === "Person" || type === "Organization") && doc.id;
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
            const authorType = doc['type'] || 'Person'; 
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
    const allContexts = getAllCodemetaContextUrls();
    const newDoc = structuredClone(doc);
    newDoc["@context"] = allContexts;
    const expanded = await jsonld.expand(newDoc);
    const compacted = await jsonld.compact(expanded, allContexts);
    return compacted;
}

async function importCodemeta() {
    var inputForm = document.querySelector('#inputForm');
    var doc = parseAndValidateCodemeta(false);

    // Re-compact document with all contexts
    // to allow importing property from any context
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

    for (const [key, items] of Object.entries(crossCodemetaFields)) {
        let value = "";
        items.forEach(item => {
           value = doc[item] || value;
        });
        setIfDefined(`#${key}`, value);
    }

    importPersons('author', 'Author', doc['author']);
  
    if (doc['keywords']) {
        if (typeof doc['keywords'] === 'string') {
            metadata.keywords = doc['keywords'].split(',').map(k => k.trim());
        } else if (!Array.isArray(doc['keywords'])) {
            metadata.keywords = [];
        }
        importKeywords(doc['keywords']);
    }
    if (doc['contributor']) {
        // If only one contributor, it is compacted to an object
        const contributors = Array.isArray(doc['contributor'])? doc['contributor'] : [doc['contributor']];
        importPersons('contributor', 'Contributor', contributors);
    }
    if (doc['referencePublication']) {
        importReferencePublication(doc['referencePublication']);
    }
    if (doc['softwareRequirements']) {
        importRequirements(doc['softwareRequirements'])
    }
}

function importReferencePublication(references) {
    if (references === undefined) {
        return;
    }
    references.forEach((reference, index) => {
        //TODO: will be an array like keywords and author in the future. Right now we manage just the first reference
        // referencePublicationUrl
        // publicationTitle
        // publicationDOI
        // issn
        // publicationDatePublished
        document.querySelector(`#referencePublicationUrl`).value = reference['@id'] || '';
        document.querySelector(`#publicationTitle`).value = reference.name || '';
        document.querySelector(`#publicationDatePublished`).value = reference.datePublished || '';
        document.querySelector(`#issn`).value = reference.issn || '';
       
        if (reference.author && reference.author.length > 0) {         
            importPersons('author_reference', 'Author_ref', reference.author);
        }



    });
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



