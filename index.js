const {
    Observable
} = require('rxjs');
const {
    parse,
    validate,
    execute,
    specifiedRules
} = require('graphql');

module.exports = (schema, query) => {
    const parsedQuery = parse(query);
    const errors = validate(
        schema,
        parsedQuery,
        specifiedRules
    );

    if (errors.length) {
        return Observable.throw(new Error(errors));
    }

    return (root = {}, context = {}, variables = {}, operationName = null) => {
        try {
            return Observable.fromPromise(execute(
                    schema,
                    parsedQuery,
                    root,
                    context,
                    variables,
                    operationName
                ))
                .do(response => {
                    if (response.errors) {
                        throw new Error(response.errors.join());
                    }
                });
        } catch (err) {
            return Observable.throw(err);
        }
    };
};
