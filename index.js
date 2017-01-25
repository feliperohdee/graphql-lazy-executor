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
        throw errors;
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
            ));
        } catch(err){
            return Observable.throw(err);
        }
    };
};
