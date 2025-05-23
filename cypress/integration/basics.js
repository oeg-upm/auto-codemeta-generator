/**
 * Copyright (C) 2020  The Software Heritage developers
 * See the AUTHORS file at the top-level directory of this distribution
 * License: GNU Affero General Public License version 3, or any later version
 * See top-level LICENSE file for more information
 */

/*
 * Tests the basic features of the application.
 */

"use strict";

describe('JSON Generation', function() {
    beforeEach(function() {
        /* Clear the session storage, as it is used to restore field data;
         * and we don't want a test to load data from the previous test. */
        cy.window().then((win) => {
            win.sessionStorage.clear()
        })
        cy.visit('./index.html');
    });

    it('works just from the software name', function() {
        cy.get('#name').type('My Test Software');
        cy.get('#generateCodemetaV2').click();

        cy.get('#errorMessage').should('have.text', '');
        cy.get('#codemetaText').then((elem) => JSON.parse(elem.text()))
            .should('deep.equal', {
                "@context": "https://doi.org/10.5063/schema/codemeta-2.0",
                "@type": "SoftwareSourceCode",
                "name": "My Test Software",
        });
    });

    it('works just from all main fields when using only one license', function() {
        cy.get('#name').type('My Test Software');
        cy.get('#description').type('This is a\ngreat piece of software');
        cy.get('#dateCreated').type('2019-10-02');
        cy.get('#datePublished').type('2020-01-01');
        cy.get('#license').type('AGPL-3.0');
        cy.get("#license").type('{enter}');
        cy.get('#generateCodemetaV2').click();

        cy.get("#license").should('have.value', '');
        cy.get('#errorMessage').should('have.text', '');
        cy.get('#codemetaText').then((elem) => JSON.parse(elem.text()))
            .should('deep.equal', {
                "@context": "https://doi.org/10.5063/schema/codemeta-2.0",
                "@type": "SoftwareSourceCode",
                "license": "https://spdx.org/licenses/AGPL-3.0",
                "dateCreated": "2019-10-02",
                "datePublished": "2020-01-01",
                "name": "My Test Software",
                "description": "This is a\ngreat piece of software",
        });
    });

    it('works just from all main fields when using multiple licenses', function() {
        cy.get('#name').type('My Test Software');
        cy.get('#description').type('This is a\ngreat piece of software');
        cy.get('#dateCreated').type('2019-10-02');
        cy.get('#datePublished').type('2020-01-01');
        cy.get('#license').type('AGPL-3.0');
        cy.get("#license").type('{enter}');
        cy.get('#license').type('MIT');
        cy.get("#license").type('{enter}');

        cy.get('#generateCodemetaV2').click();

        cy.get("#license").should('have.value', '');
        cy.get('#errorMessage').should('have.text', '');
        cy.get('#codemetaText').then((elem) => JSON.parse(elem.text()))
            .should('deep.equal', {
                "@context": "https://doi.org/10.5063/schema/codemeta-2.0",
                "@type": "SoftwareSourceCode",
                "license": ["https://spdx.org/licenses/AGPL-3.0", "https://spdx.org/licenses/MIT"],
                "dateCreated": "2019-10-02",
                "datePublished": "2020-01-01",
                "name": "My Test Software",
                "description": "This is a\ngreat piece of software",
        });
    });

    it('works when choosing licenses without the keyboard', function() {
        cy.get('#name').type('My Test Software');
        cy.get('#description').type('This is a\ngreat piece of software');
        cy.get('#dateCreated').type('2019-10-02');
        cy.get('#datePublished').type('2020-01-01');
        cy.get('#license').type('AGPL-3.0');
        // no cy.get("#license").type('{enter}'); here
        cy.get('#generateCodemetaV2').click();

        cy.get("#license").should('have.value', '');
        cy.get('#errorMessage').should('have.text', '');
        cy.get('#codemetaText').then((elem) => JSON.parse(elem.text()))
            .should('deep.equal', {
                "@context": "https://doi.org/10.5063/schema/codemeta-2.0",
                "@type": "SoftwareSourceCode",
                "license": "https://spdx.org/licenses/AGPL-3.0",
                "dateCreated": "2019-10-02",
                "datePublished": "2020-01-01",
                "name": "My Test Software",
                "description": "This is a\ngreat piece of software",
        });
    });

    it('works for new codemeta terms in both versions', function() {
        cy.get('#name').type('My Test Software');
        cy.get('#contIntegration').type('https://test-ci.org/my-software');
        cy.get('#isSourceCodeOf').type('Bigger Application');
        // cy.get('#reviewAspect').type('Some software aspect');
        // cy.get('#reviewBody').type('Some review');

        cy.get('#generateCodemetaV2').click();
        cy.get('#errorMessage').should('have.text', '');
        cy.get('#codemetaText').then((elem) => JSON.parse(elem.text()))
            .should('deep.equal', {
                "@context": "https://doi.org/10.5063/schema/codemeta-2.0",
                "@type": "SoftwareSourceCode",
                "name": "My Test Software",
                "contIntegration": "https://test-ci.org/my-software",
                "codemeta:continuousIntegration": {
                    "@id": "https://test-ci.org/my-software"
                },
                "codemeta:isSourceCodeOf": {
                    "@id": "Bigger Application"
                }
                // ,
                // "schema:review": {
                //     "type": "schema:Review",
                //     "schema:reviewAspect": "Some software aspect",
                //     "schema:reviewBody": "Some review"
                // }
        });

        cy.get('#generateCodemetaV3').click();
        cy.get('#errorMessage').should('have.text', '');
        cy.get('#codemetaText').then((elem) => JSON.parse(elem.text()))
            .should('deep.equal', {
                "@context": "https://w3id.org/codemeta/3.0",
                "@type": "SoftwareSourceCode",
                "name": "My Test Software",
                "continuousIntegration": "https://test-ci.org/my-software",
                "codemeta:contIntegration": {
                    "@id": "https://test-ci.org/my-software"
                },
                "isSourceCodeOf": "Bigger Application"
                // ,
                // "review": {
                //     "type": "Review",
                //     "reviewAspect": "Some software aspect",
                //     "reviewBody": "Some review"
                // }
        });
    });
});

describe('JSON Import', function() {
    it('works just from the software name', function() {
        cy.get('#codemetaText').then((elem) =>
            elem.text(JSON.stringify({
                "@context": "https://doi.org/10.5063/schema/codemeta-2.0",
                "@type": "SoftwareSourceCode",
                "name": "My Test Software",
            }))
        );
        cy.get('#importCodemeta').click();

        cy.get('#name').should('have.value', 'My Test Software');
    });

    it('works just from all main fields when using license as string', function() {
        cy.get('#codemetaText').then((elem) =>
            elem.text(JSON.stringify({
                "@context": "https://doi.org/10.5063/schema/codemeta-2.0",
                "@type": "SoftwareSourceCode",
                "license": "https://spdx.org/licenses/AGPL-3.0",
                "dateCreated": "2019-10-02",
                "datePublished": "2020-01-01",
                "name": "My Test Software",
                "description": "This is a\ngreat piece of software",
            }))
        );
        cy.get('#importCodemeta').click();

        cy.get('#name').should('have.value', 'My Test Software');
        cy.get('#description').should('have.value', 'This is a\ngreat piece of software');
        cy.get('#dateCreated').should('have.value', '2019-10-02');
        cy.get('#datePublished').should('have.value', '2020-01-01');
        cy.get('#license').should('have.value', '');
        cy.get("#selected-licenses").children().should('have.length', 1);
        cy.get("#selected-licenses").children().first().children().first().should('have.text', 'AGPL-3.0');
    });

    it('works just from all main fields when using license as array', function() {
        cy.get('#codemetaText').then((elem) =>
            elem.text(JSON.stringify({
                "@context": "https://doi.org/10.5063/schema/codemeta-2.0",
                "@type": "SoftwareSourceCode",
                "license": ["https://spdx.org/licenses/AGPL-3.0", "https://spdx.org/licenses/MIT"],
                "dateCreated": "2019-10-02",
                "datePublished": "2020-01-01",
                "name": "My Test Software",
                "description": "This is a\ngreat piece of software",
            }))
        );
        cy.get('#importCodemeta').click();

        cy.get('#name').should('have.value', 'My Test Software');
        cy.get('#description').should('have.value', 'This is a\ngreat piece of software');
        cy.get('#dateCreated').should('have.value', '2019-10-02');
        cy.get('#datePublished').should('have.value', '2020-01-01');
        cy.get('#license').should('have.value', '');
        cy.get("#selected-licenses").children().should('have.length', 2);
        cy.get("#selected-licenses").children().eq(0).children().first().should('have.text', 'AGPL-3.0');
        cy.get("#selected-licenses").children().eq(1).children().first().should('have.text', 'MIT');
    });

    it('works with expanded document version', function () {
        cy.get('#codemetaText').then((elem) =>
            elem.text(JSON.stringify({
                "http://schema.org/name": [
                    {
                        "@value": "My Test Software"
                    }
                ],
                "@type": [
                    "http://schema.org/SoftwareSourceCode"
                ]
            }))
        );
        cy.get('#importCodemeta').click();

        cy.get('#name').should('have.value', 'My Test Software');
    });

    it('errors on invalid type', function() {
        cy.get('#codemetaText').then((elem) =>
            elem.text(JSON.stringify({
                "@context": "https://doi.org/10.5063/schema/codemeta-2.0",
                "@type": "foo",
                "name": "My Test Software",
            }))
        );
        cy.get('#importCodemeta').click();

        // Should still be imported as much as possible
        cy.get('#name').should('have.value', 'My Test Software');

        // But must display an error
        cy.get('#errorMessage').should('have.text', 'Wrong document type: must be "SoftwareSourceCode"/"SoftwareApplication", not "foo"');
    });

    it('allows singleton array as context', function() {
        cy.get('#codemetaText').then((elem) =>
            elem.text(JSON.stringify({
                "@context": ["https://doi.org/10.5063/schema/codemeta-2.0"],
                "@type": "SoftwareSourceCode",
                "name": "My Test Software",
            }))
        );
        cy.get('#importCodemeta').click();

        cy.get('#name').should('have.value', 'My Test Software');
    });

    it('imports properties introduced in codemeta v3.0', function() {
        cy.get('#codemetaText').then((elem) =>
            elem.text(JSON.stringify({
                "@context": "https://w3id.org/codemeta/3.0",
                "@type": "SoftwareSourceCode",
                "name": "My Test Software",
                "continuousIntegration": "https://test-ci.org/my-software",
                "isSourceCodeOf": "Bigger Application"
                // ,
                // "review": {
                //     "type": "Review",
                //     "reviewAspect": "Some software aspect",
                //     "reviewBody": "Some review"
                // }
            }))
        );
        cy.get('#importCodemeta').click();

        cy.get('#contIntegration').should('have.value', 'https://test-ci.org/my-software');
        cy.get('#isSourceCodeOf').should('have.value', 'Bigger Application');
        // cy.get('#reviewAspect').should('have.value', 'Some software aspect');
        // cy.get('#reviewBody').should('have.value', 'Some review');
    });

    it('imports codemeta v2.0 properties from document with v3.0 context', function() {
        cy.get('#codemetaText').then((elem) =>
            elem.text(JSON.stringify({
                "@context": "https://w3id.org/codemeta/3.0",
                "@type": "SoftwareSourceCode",
                "name": "My Test Software",
                "codemeta:contIntegration": {
                    "id": "https://test-ci.org/my-software"
                }
            }))
        );
        cy.get('#importCodemeta').click();

        cy.get('#contIntegration').should('have.value', 'https://test-ci.org/my-software');
    });

    it('imports codemeta v3.0 properties from document with v2.0 context', function() {
        cy.get('#codemetaText').then((elem) =>
            elem.text(JSON.stringify({
                "@context": "https://doi.org/10.5063/schema/codemeta-2.0",
                "@type": "SoftwareSourceCode",
                "name": "My Test Software",
                "codemeta:continuousIntegration": {
                    "id": "https://test-ci.org/my-software"
                },
                "codemeta:isSourceCodeOf": {
                    "id": "Bigger Application"
                }
                // ,
                // "schema:review": {
                //     "type": "schema:Review",
                //     "schema:reviewAspect": "Some software aspect",
                //     "schema:reviewBody": "Some review"
                // }
            }))
        );
        cy.get('#importCodemeta').click();

        cy.get('#contIntegration').should('have.value', 'https://test-ci.org/my-software');
        cy.get('#isSourceCodeOf').should('have.value', 'Bigger Application');
        // cy.get('#reviewAspect').should('have.value', 'Some software aspect');
        // cy.get('#reviewBody').should('have.value', 'Some review');
    });

    it('imports newest version property when it is duplicate in multiple version context', function() {
        cy.get('#codemetaText').then((elem) =>
            elem.text(JSON.stringify({
                "@context": "https://doi.org/10.5063/schema/codemeta-2.0",
                "@type": "SoftwareSourceCode",
                "name": "My Test Software",
                "contIntegration": "https://test-ci1.org/my-software",
                "codemeta:continuousIntegration": {
                    "id": "https://test-ci2.org/my-software"
                },
            }))
        );
        cy.get('#importCodemeta').click();

        cy.get('#contIntegration').should('have.value', 'https://test-ci2.org/my-software');

        cy.get('#codemetaText').then((elem) =>
            elem.text(JSON.stringify({
                "@context": "https://w3id.org/codemeta/3.0",
                "@type": "SoftwareSourceCode",
                "name": "My Test Software",
                "continuousIntegration": "https://test-ci1.org/my-software",
                "codemeta:contIntegration": {
                    "id": "https://test-ci2.org/my-software"
                },
            }))
        );
        cy.get('#importCodemeta').click();

        cy.get('#contIntegration').should('have.value', 'https://test-ci1.org/my-software');
    });
});

describe('Test populateFieldsCodemeta with missing license', () => {
    it('Should handle metadata without license gracefully', () => {
        // Cargar el JSON directamente con fetch
        cy.visit('./index.html');

        cy.window().then((win) => {
            // Realiza un fetch para obtener el JSON
            fetch('cypress/fixtures/metadata_panda.json')
                .then((response) => response.json())
                .then((metadata) => {
                    // Llama a la función populateFieldsCodemeta con el metadata cargado
                    expect(win.populateFieldsCodemeta).to.exist;
                    win.populateFieldsCodemeta(metadata);

                    // Verificar que los elementos están correctamente actualizados
                    cy.get('#selected-licenses').should('be.empty'); // Licencias seleccionadas vacías
                    cy.get('#selectedLicensesHidden').should('have.value', ''); // Campo oculto vacío
                    cy.get('#license').should('have.attr', 'placeholder', ''); // Placeholder vacío
                });
        });
    });
});

describe('Test populateFieldsCodemeta with keywords', () => {
    it('Should populate keywords correctly', () => {
        cy.visit('./index.html');

        cy.window().then((win) => {
            fetch('cypress/fixtures/metadata_keywords.json')
                .then((response) => response.json())
                .then((metadata) => {

                    expect(win.populateFieldsCodemeta).to.exist;
                    win.populateFieldsCodemeta(metadata);
                    cy.get('#keyword_container input[name^="keyword_"]').should('have.length', metadata.keywords.length);

                    metadata.keywords.forEach((keyword, index) => {
                        const keywordIndex = index + 1;
                        if (typeof keyword === 'string') {
                            cy.get(`#keyword_${keywordIndex}_name`).should('have.value', keyword);
                        } else if (keyword['@type'] === 'URL') {
                            cy.get(`#keyword_${keywordIndex}_id`).should('have.value', keyword['@id']);
                        } else if (keyword['@type'] === 'DefinedTerm') {
                            cy.get(`#keyword_${keywordIndex}_name`).should('have.value', keyword.name);
                            cy.get(`#keyword_${keywordIndex}_id`).should('have.value', keyword['@id']);
                        }
                    });
                });
        });
    });
});
