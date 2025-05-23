/**
 * Copyright (C) 2020-2021  The Software Heritage developers
 * See the AUTHORS file at the top-level directory of this distribution
 * License: GNU Affero General Public License version 3, or any later version
 * See top-level LICENSE file for more information
 */

/*
 * Validators for codemeta objects derived from http://schema.org/Thing.
 */

function getDocumentType(doc) {
    // TODO: check there is at most one.
    // FIXME: is the last variant allowed?
    return doc["type"] || doc["@type"] || doc["codemeta:type"]
}

function getDocumentId(doc) {
    return doc["id"] || doc["@id"];
}

function isCompactTypeEqual(type, compactedType) {
    // FIXME: are all variants allowed?
    return (type == `${compactedType}`
        || type == `schema:${compactedType}`
        || type == `codemeta:${compactedType}`
        || type == `http://schema.org/${compactedType}`
    );
}

function isFieldFromOtherVersionToIgnore(fieldName) {
    return ["codemeta:contIntegration", "codemeta:continuousIntegration",
        "codemeta:isSourceCodeOf",
        "schema:roleName", "schema:startDate", "schema:endDate",
        "schema:review", "schema:reviewAspect", "schema:reviewBody",
        "schema:releaseNotes"].includes(fieldName);
}

function noValidation(fieldName, doc) {
    return true;
}

// Validates subtypes of Thing, or URIs
//
// typeFieldValidators is a map: {type => {fieldName => fieldValidator}}
function validateThingOrId(parentFieldName, typeFieldValidators, doc) {
    var acceptedTypesString = Object.keys(typeFieldValidators).join('/');

    if (typeof doc == 'string') {
        if (!isUrlOrBlankNodeId(doc)) {
            setError(`"${parentFieldName}" must be an URL or a ${acceptedTypesString} object, not: ${JSON.stringify(doc)}`);
            return false;
        }
        else {
            return true;
        }
    }
    else if (!Array.isArray(doc) && typeof doc == 'object') {
        return validateThing(parentFieldName, typeFieldValidators, doc);
    }
    else {
        setError(`"${parentFieldName}" must be a ${acceptedTypesString} object or URI, not ${JSON.stringify(doc)}`);
        return false;
    }
}
function validateKeyword(fieldName, doc) {
    if (typeof doc === 'string') {
        return true; // Es un keyword simple (texto), válido
    }

    if (typeof doc === 'object' && !Array.isArray(doc)) {
        if (doc["@type"] === "URL") {
            if (!doc["@id"] || !isUrlOrBlankNodeId(doc["@id"])) {
                setError(`"${fieldName}" (URL) must have a valid "@id" field.`);
                return false;
            }
            return true;
        }

        if (doc["@type"] === "DefinedTerm") {
            if (!doc["name"] || typeof doc["name"] !== "string") {
                setError(`"${fieldName}" (DefinedTerm) must have a "name" field.`);
                return false;
            }
            if (!doc["@id"] || !isUrlOrBlankNodeId(doc["@id"])) {
                setError(`"${fieldName}" (DefinedTerm) must have a valid "@id" field.`);
                return false;
            }
            return true;
        }
    }

    setError(`"${fieldName}" must be a string, a URL object, or a DefinedTerm object.`);
    return false;
}
// Validates subtypes of Thing
//
// typeFieldValidators is a map: {type => {fieldName => fieldValidator}}
function validateThing(parentFieldName, typeFieldValidators, doc) {
    // TODO: check there is either id or @id but not both
    // TODO: check there is either type or @type but not both

    var acceptedTypesString = Object.keys(typeFieldValidators).join('/');

    var documentType = getDocumentType(doc);

    var id = getDocumentId(doc);
    if (id !== undefined && !isUrlOrBlankNodeId(id)) {
        setError(`"${parentFieldName}" has an invalid URI as id: ${JSON.stringify(id)}"`);
        return false;
    }

    if (documentType === undefined) {
        if (id === undefined) {
            setError(`"${parentFieldName}" must be a (list of) ${acceptedTypesString} object(s) or an URI, but is missing a type/@type.`);
            return false;
        }
        else {
            // FIXME: we have an @id but no @type, what should we do?
            return true;
        }
    }
    for (expectedType in typeFieldValidators) {
        if (isCompactTypeEqual(documentType, expectedType)) {
            var fieldValidators = typeFieldValidators[expectedType];
            return Object.entries(doc).every((entry) => {
                var fieldName = entry[0];
                var subdoc = entry[1];
                if (fieldName == "type" || fieldName == "@type") {
                    // Was checked before
                    return true;
                }
                else if (isFieldFromOtherVersionToIgnore(fieldName)) {
                    // Do not check fields from other versions FIXME
                    return true;
                }
                else {
                    var validator = fieldValidators[fieldName];
                    if (validator === undefined) {
                        // TODO: find if it's a field that belongs to another type,
                        // and suggest that to the user
                        setError(`Unknown field "${fieldName}" in "${parentFieldName}".`)
                        return false;
                    }
                    else {
                        return validator(fieldName, subdoc);
                    }
                }
            });
        }
    }

    setError(`"${parentFieldName}" type must be a (list of) ${acceptedTypesString} object(s), not ${JSON.stringify(documentType)}`);
    return false;
}


// Helper function to validate a field is either X or a list of X.
function validateListOrSingle(fieldName, doc, validator) {
    if (Array.isArray(doc)) {
        return doc.every((subdoc) => validator(subdoc, true));
    }
    else {
        return validator(doc, false);
    }
}

// Validates a CreativeWork or an array of CreativeWork
function validateCreativeWorks(fieldName, doc) {
    return validateListOrSingle(fieldName, doc, (subdoc, inList) => {
        return validateCreativeWork(fieldName, subdoc);
    });
}

// Validates a single CreativeWork
function validateCreativeWork(fieldName, doc) {
    return validateThingOrId(fieldName, {
        "CreativeWork": creativeWorkFieldValidators,
        "SoftwareSourceCode": softwareFieldValidators,
        "SoftwareApplication": softwareFieldValidators,
    }, doc);
}

// Validates a Person, Organization or an array of these
function validateActors(fieldName, doc) {
    return validateListOrSingle(fieldName, doc, (subdoc, inList) => {
        return validateActor(fieldName, subdoc);
    });
}

function validateKeywords(fieldName, doc) {
    return validateListOrSingle(fieldName, doc, (subdoc, inList) => {
        return validateKeyword(fieldName, subdoc);
    });
}

// Validates a Person or an array of Person
function validatePersons(fieldName, doc) {
    return validateListOrSingle(fieldName, doc, (subdoc, inList) => {
        return validatePerson(fieldName, subdoc);
    });
}

// Validates an Organization or an array of Organization
function validateOrganizations(fieldName, doc) {
    return validateListOrSingle(fieldName, doc, (subdoc, inList) => {
        return validateOrganization(fieldName, subdoc);
    });
}

// Validates a single Person or Organization
function validateActor(fieldName, doc) {
    return validateThingOrId(fieldName, {
        "Role": roleFieldValidators,
        "Person": personFieldValidators,
        "Organization": organizationFieldValidators,
    }, doc);
}

// Validates a single Person object
function validatePerson(fieldName, doc) {
    return validateThingOrId(fieldName, {"Person": personFieldValidators}, doc);
}

// Validates a single Organization object
function validateOrganization(fieldName, doc) {
    return validateThingOrId(fieldName, {"Organization": organizationFieldValidators}, doc);
}

function validateReview(fieldName, doc) {
    return validateThingOrId(fieldName, {"Review": reviewFieldValidators}, doc);
}


var softwareFieldValidators = {
    "@id": validateUrl,
    "id": validateUrl,

    "codeRepository": validateUrls,
    "programmingLanguage": noValidation,
    "runtimePlatform": validateTexts,
    "targetProduct": noValidation, // TODO: validate SoftwareApplication
    "applicationCategory": validateTextsOrUrls,
    "applicationSubCategory": validateTextsOrUrls,
    "downloadUrl": validateUrls,
    "fileSize": validateText,  // TODO
    "installUrl": validateUrls,
    "memoryRequirements": validateTextsOrUrls,
    "operatingSystem": validateTexts,
    "permissions": validateTexts,
    "processorRequirements": validateTexts,
    "releaseNotes": validateTextsOrUrls,
    "softwareHelp": validateCreativeWorks,
    "softwareRequirements": noValidation, // TODO: validate SoftwareSourceCode
    "softwareVersion": validateText, // TODO?
    "storageRequirements": validateTextsOrUrls,
    "supportingData": noValidation, // TODO
    "author": validateActors,
    "citation": validateCreativeWorks, // TODO
    "contributor": validateActors,
    "copyrightHolder": validateActors,
    "copyrightYear": validateNumbers,
    "creator": validateActors, // TODO: still in codemeta 2.0, but removed from master
    "dateCreated": validateDate,
    "dateModified": validateDate,
    "datePublished": validateDate,
    "editor": validatePersons,
    "encoding": noValidation,
    "fileFormat": validateTextsOrUrls,
    "funder": validateActors, // TODO: may be other types
    "keywords": validateKeywords,
    "license": validateCreativeWorks,
    "producer": validateActors,
    "provider": validateActors,
    "publisher": validateActors,
    "sponsor": validateActors,
    "version": validateNumberOrText,
    "isAccessibleForFree": validateBoolean,
    "isSourceCodeOf": validateTextsOrUrls,
    "isPartOf": validateCreativeWorks,
    "hasPart": validateCreativeWorks,
    "position": noValidation,
    "identifier": noValidation, // TODO
    "description": validateText,
    "name": validateText,
    "sameAs": validateUrls,
    "url": validateUrls,
    "relatedLink": validateUrls,
    "review": validateReview,

    "softwareSuggestions": noValidation, // TODO: validate SoftwareSourceCode
    "maintainer": validateActors,
    "contIntegration": validateUrls,
    "continuousIntegration": validateUrls,
    "buildInstructions": validateUrls,
    "developmentStatus": validateText, // TODO: use only repostatus strings?
    "embargoDate": validateDate,
    "embargoEndDate": validateDate,
    "funding": validateText,
    "issueTracker": validateUrls,
    "referencePublication": noValidation, // TODO?
    "readme": validateUrls,
};

var creativeWorkFieldValidators = {
    "@id": validateUrl,
    "id": validateUrl,

    "author": validateActors,
    "citation": validateCreativeWorks, // TODO
    "contributor": validateActors,
    "copyrightHolder": validateActors,
    "copyrightYear": validateNumbers,
    "creator": validateActors, // TODO: still in codemeta 2.0, but removed from master
    "dateCreated": validateDate,
    "dateModified": validateDate,
    "datePublished": validateDate,
    "editor": validatePersons,
    "encoding": noValidation,
    "funder": validateActors, // TODO: may be other types
    "keywords": validateTexts,
    "license": validateCreativeWorks,
    "producer": validateActors,
    "provider": validateActors,
    "publisher": validateActors,
    "sponsor": validateActors,
    "version": validateNumberOrText,
    "isAccessibleForFree": validateBoolean,
    "isPartOf": validateCreativeWorks,
    "hasPart": validateCreativeWorks,
    "position": noValidation,
    "identifier": noValidation, // TODO
    "description": validateText,
    "name": validateText,
    "sameAs": validateUrls,
    "url": validateUrls,
};

var roleFieldValidators = {
    "roleName": validateText,
    "startDate": validateDate,
    "endDate": validateDate,

    "schema:author": validateActor,
    "contributor": validateActor
};

var personFieldValidators = {
    "@id": validateUrlOrBlankNode,
    "id": validateUrlOrBlankNode,

    "givenName": validateText,
    "familyName": validateText,
    "email": validateText,
    "affiliation": validateOrganizations,
    "identifier": validateUrls,
    "name": validateText,  // TODO: this is technically valid, but should be allowed here?
    "url": validateUrls,
};


var organizationFieldValidators = {
    // "@id": validateUrl,
    // "id": validateUrl,
    "@id": validateUrlOrBlankNode,
    "id": validateUrlOrBlankNode,
    
    "email": validateText,
    "identifier": validateUrls,
    "name": validateText,
    "address": validateText,
    "sponsor": validateActors,
    "funder": validateActors, // TODO: may be other types
    "isPartOf": validateOrganizations,
    "url": validateUrls,

    // TODO: add more?
};

const reviewFieldValidators = {
    "reviewAspect": validateText,
    "reviewBody": validateText,
}
