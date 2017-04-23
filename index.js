const {
    Observable
} = require('rxjs');
const {
    parse,
    validate,
    execute,
    specifiedRules
} = require('graphql');

module.exports = (schema, requestString, validators = []) => {
    const ast = parse(requestString);
    const errors = validate(
        schema,
        ast,
        specifiedRules.concat(validators)
    );

    if (errors.length) {
        throw new Error(errors);
    }

    const executor = (root = {}, context = {}, variables = {}, operationName = null) => {
        try {
            return Observable.fromPromise(execute(
                    schema,
                    ast,
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

    executor.ast = ast;

    return executor;
};
