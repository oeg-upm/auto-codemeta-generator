/**
 * Copyright (C) 2020  The Software Heritage developers
 * See the AUTHORS file at the top-level directory of this distribution
 * License: GNU Affero General Public License version 3, or any later version
 * See top-level LICENSE file for more information
 */

/*
 * Reads a Codemeta file and shows human-friendly errors on it.
 *
 * This validator intentionaly does not use a schema, in order to show errors
 * that are easy to understand for users with no understanding of JSON-LD.
 */

// const FASTAPI_URL = 'http://127.0.0.1:7877'; 
let CONFIG = {};

fetch('./js/config.json')
    .then(response => response.json())
    .then(data => {
        CONFIG = data;
    })
    .catch(error => {
        console.error('Error loading config:', error);
    });
function validateDocument(doc) {
    if (!Array.isArray(doc) && typeof doc != 'object') {
        setError("Document must be an object (starting and ending with { and }), not ${typeof doc}.")
        return false;
    }
    // TODO: validate id/@id

    // TODO: check there is either type or @type but not both
    var type = getDocumentType(doc);
    if (type === undefined) {
        setError("Missing type (must be SoftwareSourceCode or SoftwareApplication).")
        return false;
    }
    else if (!isCompactTypeEqual(type, "SoftwareSourceCode") && !isCompactTypeEqual(type, "SoftwareApplication")) {
        // Check this before other fields, as a wrong type error is more
        // understandable than "invalid field".
        setError(`Wrong document type: must be "SoftwareSourceCode"/"SoftwareApplication", not ${JSON.stringify(type)}`)
        return false;
    }
    else {
        return Object.entries(doc).every((entry) => {
            var fieldName = entry[0];
            var subdoc = entry[1];
            if (fieldName == "@context") {
                // Was checked before
                return true;
            }
            else if (fieldName == "type" || fieldName == "@type") {
                // Was checked before
                return true;
            }
            else if (isFieldFromOtherVersionToIgnore(fieldName)) {
                // Do not check fields from other versions FIXME
                return true;
            }
            else {
                var validator = softwareFieldValidators[fieldName];
                if (validator === undefined) {
                    // TODO: find if it's a field that belongs to another type,
                    // and suggest that to the user
                    setError(`Unknown field "${fieldName}".`)
                    return false;
                }
                else {
                    return validator(fieldName, subdoc);
                }
            }
        });
    }
}

function getRepoDefault(event) {
    if (event.key === "Tab" && event.target.value.trim() === '') {
        event.preventDefault(); 
        event.target.value = CONFIG.default_repo; 
    }
}


function parseAndValidateCodemeta(showPopup) {
    var codemetaText = document.querySelector('#codemetaText').innerText;
    var doc;

    try {
        doc = JSON.parse(codemetaText);
    }
    catch (e) {
        setError(`Could not read codemeta document because it is not valid JSON (${e}). Check for missing or extra quote, colon, or bracket characters.`);
        return {};
    }

    setError("");

    var isValid = validateDocument(doc);
    if (showPopup) {
        if (isValid) {
            alert('Document is valid!')
        }
        else {
            alert('Document is invalid.');
        }
    }

    return doc;
}

function migrateRemoteRepository() {

    const spinner = document.getElementById('spinner');
    const repoUrl = document.getElementById('url_repo').value;
    const requestOptions = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    }; 

    spinner.style.display = 'block'

    if (!repoUrl) {
        spinner.style.display = 'none';
        alert('Please enter the repository URL.');
        return;
    }

    // fetch(`https://127.0.0.1:7979/metadata?url=https://github.com/dgarijo/Widoco/&threshold=0.8&ignoreClassifiers=false`, 
    //     requestOptions)
    // Send request to FastAPI
    const apiUrl = CONFIG.fastapi_url.replace(/\/$/, ""); 
    console.log(`${apiUrl}/metadata?url=${encodeURIComponent(repoUrl)}&threshold=0.8&ignoreClassifiers=false`);
    fetch(`${apiUrl}/metadata?url=${encodeURIComponent(repoUrl)}&threshold=0.8&ignoreClassifiers=false`, 
    requestOptions)
    // fetch(`http://127.0.0.1:7979/metadata?url=https://github.com/dgarijo/Widoco/&threshold=0.8&ignoreClassifiers=false`, 
    //     requestOptions)
    .then(response => {

        if (!response.ok) {
            throw new Error('Error in server response');
        }
        return response.json(); 
    })
    .then(metadata => {
        spinner.style.display = 'none';

        populateFieldsCodemeta(metadata);

        setTimeout(() => {
            alert('Metadata received and fields updated!');
            generateCodemeta()
        }, 100); 
    })
    .catch(error => {
        spinner.style.display = 'none';
        console.error('Error:', error);
        alert('There was an error extracting data from the repository.');
    });


}

// Esto era con el json
function populateFields(metadata) {

    if (metadata.keywords && metadata.keywords.length > 0) {
        const keywords = metadata.keywords.map(k => k.result.value).join(', ');
        document.getElementById('keywords').value = keywords;
    }
    if (metadata.description && metadata.description.length > 0) {
        const description = metadata.description[0].result.value;
        document.getElementById('description').value = description;
    }
    if (metadata.full_title && metadata.full_title.length > 0) {
        const fullTitle = metadata.full_title[0].result.value;
        document.getElementById('name').value = fullTitle;
    }
    if (metadata.identifier && metadata.identifier.length > 0) {
        const identifier = metadata.identifier[0].result.value;
        document.getElementById('identifier').value = identifier;
    }
    if (metadata.type && metadata.type.length > 0) {
        const type = metadata.type;
        document.getElementById('applicationCategory').value = type;
    }
    if (metadata.date_created && metadata.date_created.length > 0) {
        const rawDate = metadata.date_created[0].result.value;
        const formattedDate = rawDate.split('T')[0]; // Formatear a YYYY-MM-DD
        document.getElementById('dateCreated').value = formattedDate;
    }

    if (metadata.license && metadata.license.length > 0) {
        const selectedLicensesDiv = document.getElementById('selected-licenses');
        selectedLicensesDiv.innerHTML = ''; 

        metadata.license.forEach(lic => {
            const spdxId = lic.result.spdx_id;
            if (spdxId) {
                const newLicense = document.createElement('div');
                newLicense.innerHTML = `
                    <span class="license-id">${spdxId}</span>
                    <button type="button" class="remove-license" onclick="removeLicense(this)">Remove</button>
                `;
                selectedLicensesDiv.appendChild(newLicense);
            }
        });
    }

    if (metadata.releases && metadata.releases.length > 0) {
        let oldestDatePublished = metadata.releases[0].result.date_published;
        let latestDatePublished = metadata.releases[0].result.date_published;
        let latestHtmlUrl = metadata.releases[0].result.html_url;
        let latestDescription = metadata.releases[0].result.description
        let latestTag = metadata.releases[0].result.tag;

        metadata.releases.forEach(release => {
            const datePublished = release.result.date_published;
            if (new Date(datePublished) < new Date(oldestDatePublished)) {
                oldestDatePublished = datePublished;
            }
            if (new Date(datePublished) > new Date(latestDatePublished)) {
                latestDatePublished = datePublished;
                latestTag = release.result.tag;
                latestHtmlUrl = release.result.html_url
                latestDescription = release.result.description
            }
        });
        const formattedDatePublished = oldestDatePublished.split('T')[0]; // Formatear a YYYY-MM-DD
        const formattedDateModified = latestDatePublished.split('T')[0];
        document.getElementById('datePublished').value = formattedDatePublished;
        document.getElementById('version').value = latestTag;
        document.getElementById('downloadUrl').value = latestHtmlUrl;
        document.getElementById('releaseNotes').value = latestDescription;
        document.getElementById('dateModified').value = formattedDateModified;
    }

    if (metadata.code_repository && metadata.code_repository.length > 0) {
        const codeRepository = metadata.code_repository[0].result.value;
        document.getElementById('codeRepository').value = codeRepository;
    }

    if (metadata.issue_tracker && metadata.issue_tracker.length > 0) {
        const issueTracker = metadata.issue_tracker[0].result.value;
        document.getElementById('issueTracker').value = issueTracker;
    }

    let relatedLinks = [];
    if (metadata.related_documentation && metadata.related_documentation.length > 0) {
        relatedLinks = relatedLinks.concat(metadata.related_documentation.map(doc => doc.result.value));
    }
    if (metadata.related_papers && metadata.related_papers.length > 0) {
        relatedLinks = relatedLinks.concat(metadata.related_papers.map(paper => paper.result.value));
    }
    if (relatedLinks.length > 0) {
        document.getElementById('relatedLink').value = relatedLinks.join('\n');
    }
    if (metadata.programming_languages && metadata.programming_languages.length > 0) {
        const programmingLanguages = metadata.programming_languages.map(lang => lang.result.value).join(', ');
        document.getElementById('programmingLanguage').value = programmingLanguages;
    }
    if (metadata.requirements && metadata.requirements.length > 0) {
        const softwareRequirements = metadata.requirements
        .map(req => req.result.value.trim())
        .filter(req => req !== '/' && req !== '')
        .join(', ');
        document.getElementById('softwareRequirements').value = softwareRequirements;
    }

    if (metadata.repository_status && metadata.repository_status.length > 0) {
        const statusUrl = metadata.repository_status[0].result.value;
        const statusMatch = statusUrl.match(/#([^/]+)/);
        if (statusMatch) {
            const statusValue = statusMatch[1]; 
            document.getElementById('developmentStatus').value = statusValue;
        }
    }
    
    if (metadata.citation && metadata.citation.length > 0) {
        let authors = getAuthors(metadata.citation)

        if (authors.length > 0) {
            populateAuthors(authors)
        }   
    }
}

//it seems with codemeta.json we obtein less information than pure json. 
function populateFieldsCodemeta(metadata) {

    if (metadata.keywords) {
        let keywords;
        if (Array.isArray(metadata.keywords)) {
            keywords = metadata.keywords.map(k => k.result.value).join(', ');
        } else {
            keywords = metadata.keywords; 
        }
        document.getElementById('keywords').value = keywords;
    }

    if (metadata.description) {
        let description;
        if (Array.isArray(metadata.description)) {
            description = metadata.description.join(' ');
        } else {
            description = metadata.description; // Asumir que ya es una cadena de texto
        }
        document.getElementById('description').value = description;
    }

    if (metadata['@type']) {
        let type = metadata['@type'];
        document.getElementById('applicationCategory').value = type;
    }
    if (metadata.name) {
        let fullTitle;
        if (Array.isArray(metadata.name)) {
            name = metadata.name.map(ft => ft.result.value).join(', ');
        } else {
            name = metadata.name; 
        }
        document.getElementById('name').value = name;
    }

    if (metadata.identifier) {
        let identifier;
        if (Array.isArray(metadata.identifier)) {
            identifier = metadata.identifier.map(id => id.result.value).join(', ');
        } else {
            identifier = metadata.identifier; 
        }
        document.getElementById('identifier').value = identifier;
    }

    if (metadata.dateCreated) {
        let dateCreated;
        if (Array.isArray(metadata.dateCreated)) {
            dateCreated = metadata.dateCreated.map(dc => dc.result.value.split('T')[0]).join(', ');
        } else {
            dateCreated = metadata.dateCreated.split('T')[0]; // Asumir que ya es una cadena de texto
        }
        document.getElementById('dateCreated').value = dateCreated;
    }

    if (metadata.dateModified) {
        let dateModified;
        if (Array.isArray(metadata.dateModified)) {
            dateModified = metadata.dateModified.map(dm => dm.result.value.split('T')[0]).join(', ');
        } else {
            dateModified = metadata.dateModified.split('T')[0]; // Asumir que ya es una cadena de texto
        }
        document.getElementById('dateModified').value = dateModified;
    }
    if (metadata.datePublished) {
        let datePublished;
        if (Array.isArray(metadata.datePublished)) {
            datePublished = metadata.datePublished.map(dm => dm.result.value.split('T')[0]).join(', ');
        } else {
            datePublished = metadata.datePublished.split('T')[0]; 
        }
        document.getElementById('datePublished').value = datePublished;
    }
    if (metadata.codeRepository) {
        document.getElementById('codeRepository').value = metadata.codeRepository;
    }

    if (metadata.issueTracker) {
        document.getElementById('issueTracker').value = metadata.issueTracker;
    }

    if (metadata.license) {
        const selectedLicensesDiv = document.getElementById('selected-licenses');
        selectedLicensesDiv.innerHTML = ''; 

        const spdxId = metadata.license.identifier.split('/').pop();
        const newLicense = document.createElement('div');
        newLicense.innerHTML = `
            <span class="license-id">${spdxId}</span>
            <button type="button" class="remove-license" onclick="removeLicense(this)">Remove</button>
        `;
        selectedLicensesDiv.appendChild(newLicense);
    }

    if (metadata.downloadUrl) {
        document.getElementById('downloadUrl').value = metadata.downloadUrl;
    }
    if (metadata.softwareVersion) {
        document.getElementById('version').value = metadata.softwareVersion;
    }
    if (metadata.releaseNotes) {
        document.getElementById('releaseNotes').value = metadata.releaseNotes;
    }

   if (metadata.referencePublication && metadata.referencePublication.length > 0) {

        const firstPublication = metadata.referencePublication[0]; // De momento nos quedamos con el primero

        if (firstPublication.url) {
            document.getElementById('referencePublicationUrl').value = firstPublication.url;
        }
        if (firstPublication.name) {
            document.getElementById('publicationTitle').value = firstPublication.name;
        }
        if (firstPublication.identifier) {
            document.getElementById('publicationDOI').value = firstPublication.identifier;
        }
        if (firstPublication.issn) {
            document.getElementById('issn').value = firstPublication.issn;
        }
        if (firstPublication.datePublished) {
            document.getElementById('publicationDatePublished').value = firstPublication.datePublished;
        }
        let relatedLinks = metadata.referencePublication
            .map(pub => pub.url)
            .filter((url, index, self) => url && self.indexOf(url) === index); 
        document.getElementById('relatedLink').value = relatedLinks.join('\n');
   }

    if (metadata.programmingLanguage && metadata.programmingLanguage.length > 0) {
        const programmingLanguages = metadata.programmingLanguage.join(', ');
        document.getElementById('programmingLanguage').value = programmingLanguages;
    }

    if (metadata.softwareRequirements && metadata.softwareRequirements.length > 0) {
        const softwareRequirements = metadata.softwareRequirements
            .map(req => req.trim())
            .filter(req => req !== '/' && req !== '')
            .join(', ');
        document.getElementById('softwareRequirements').value = softwareRequirements;
    }

    if (metadata.developmentStatus && metadata.repository_status.length > 0) {
        document.getElementById('developmentStatus').value = statusValue;
    }

    if (metadata.author && metadata.author.length > 0) {
        populateAuthors(metadata.author)
    }
    // if (metadata.citation && metadata.citation.length > 0) {
    //     let authors = getAuthors(metadata.citation)

    //     if (authors.length > 0) {
    //         populateAuthors(authors)
    //     }   
    // }
}

function getAuthors(citation) {

    let authorsMap = new Map();
    citation.forEach(cit => {
        if (cit.result.format === 'cff') {
            const cffValue = cit.result.value;
            const cffLines = cffValue.split('\n');
            let currentAuthor = null;
            let isAuthorSection = false;

            cffLines.forEach(line => {
                line = line.trim();

                if (line.startsWith("authors:")) {
                    isAuthorSection = true;
                    return; 
                }

                if (!isAuthorSection) return;
                
                const familyNameMatch = line.match(/family-names:\s*(.+)/);
                const givenNameMatch = line.match(/given-names:\s*(.+)/);
                const orcidMatch = line.match(/orcid:\s*(.+)/);
                const emailMatch = line.match(/email:\s*(.+)/);

                if (familyNameMatch) {
                    if (currentAuthor) {
                        // Guardar el autor actual en el mapa si tiene más información
                        const fullName = `${currentAuthor.familyName} ${currentAuthor.givenName}`;
                        if (authorsMap.has(fullName)) {
                            const existingAuthor = authorsMap.get(fullName);
                            currentAuthor = mergeAuthors(existingAuthor, currentAuthor);
                        }
                        authorsMap.set(fullName, currentAuthor);
                    }
                    currentAuthor = { type: 'Person', familyName: familyNameMatch[1].trim() };
                }
                if (givenNameMatch && currentAuthor) {
                    currentAuthor.givenName = givenNameMatch[1].trim();
                }
                if (orcidMatch && currentAuthor) {
                    currentAuthor.id = orcidMatch[1].trim().replace(/"/g, '');
                }
                if (emailMatch && currentAuthor) {
                    currentAuthor.email = emailMatch[1].trim();
                }
            });

            if (currentAuthor) {
                const fullName = `${currentAuthor.familyName} ${currentAuthor.givenName}`;
                if (authorsMap.has(fullName)) {
                    const existingAuthor = authorsMap.get(fullName);
                    currentAuthor = mergeAuthors(existingAuthor, currentAuthor);
                }
                authorsMap.set(fullName, currentAuthor);
            }
        }
    }); 

    const authors = Array.from(authorsMap.values());
    return authors
}

function mergeAuthors(existingAuthor, newAuthor) {
    return {
        type: 'Person',
        familyName: existingAuthor.familyName || newAuthor.familyName,
        givenName: existingAuthor.givenName || newAuthor.givenName,
        id: existingAuthor.id || newAuthor.id,
        email: existingAuthor.email || newAuthor.email
    };
}

function populateAuthors(authors) {
    // Eliminamos los autores que hayamos creado antes para no solapar
    const authorContainer = document.querySelector('#author_container');
    authorContainer.innerHTML = `
        <legend>Authors</legend>
        <input type="hidden" id="author_nb" value="0" />
        <div id="addRemoveAuthor">
            <input type="button" id="author_add" value="Add one" onclick="addPerson('author', 'Author');" />
            <input type="button" id="author_remove" value="Remove last" onclick="removePerson('author');" />
        </div>
    `;

    authors.forEach((author, index) => {

        if (author['@type'] == 'Person'){
            const personId = addPerson('author', 'Author');
            const personPrefix = `author_${personId}`;
    
            document.querySelector(`#${personPrefix}_familyName`).value = author.familyName || '';
            document.querySelector(`#${personPrefix}_givenName`).value = author.givenName || personPrefix;
            document.querySelector(`#${personPrefix}_id`).value = author['@id'] || '';
            document.querySelector(`#${personPrefix}_email`).value = author.email || '';
        }
    });
}
