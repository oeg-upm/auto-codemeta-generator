describe('Schema.org export', function() {
    beforeEach(function() {
        cy.window().then((win) => { win.sessionStorage.clear() })
        cy.visit('./index.html');
    });

    it('exports schema.org JSON-LD correctly', function() {
        cy.get('#name').type('My Test Software');
        cy.get('#description').type('A description');
        cy.get('#codeRepository').type('https://github.com/test/test');
        cy.get('#contIntegration').type('https://ci.example.com');
        cy.get('#generateSchemaOrg').click();
        cy.get('#errorMessage').should('have.text', '');
        cy.get('#codemetaText').then((elem) => JSON.parse(elem.text()))
            .should('deep.equal', {
                "@context": {
                    "@vocab": "https://schema.org/",
                    "codemeta": "https://w3id.org/codemeta/3.0/"
                },
                "@type": ["SoftwareSourceCode", "SoftwareApplication"],
                "name": "My Test Software",
                "description": "A description",
                "codemeta:codeRepository": "https://github.com/test/test",
                "codemeta:continuousIntegration": "https://ci.example.com"
            });
    });

    it('wraps author in @list', function() {
        cy.get('#name').type('My Test Software');
        cy.get('#author_add').click();
        cy.get('#author_1_givenName').type('Jane');
        cy.get('#author_1_familyName').type('Doe');
        cy.get('#generateSchemaOrg').click();
        cy.get('#errorMessage').should('have.text', '');
        cy.get('#codemetaText').then((elem) => JSON.parse(elem.text()))
            .should('have.property', 'author')
            .should('have.property', '@list');
    });
});