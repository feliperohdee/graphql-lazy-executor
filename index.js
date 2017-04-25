const {
    Observable
} = require('rxjs');
const {
    parse,
    validate,
    execute,
    specifiedRules
} = require('graphql');

module.exports = (schema, requestString, customValidators = [], customExecutor = null) => {
    const documentAST = parse(requestString);
    const errors = validate(
        schema,
        documentAST,
        specifiedRules.concat(customValidators)
    );

    if (errors.length) {
        throw new Error(errors);
    }

    const executor = (rootValue = {}, contextValue = {}, variableValues = {}, operationName = null) => {
        try {
            const executorArgs = [
                schema,
                documentAST,
                rootValue,
                contextValue,
                variableValues,
                operationName
            ];

            const executor = customExecutor ? customExecutor.apply(null, executorArgs) : Observable.fromPromise(execute.apply(null, executorArgs));

            return executor
                .do(response => {
                    if (response.errors) {
                        throw new Error(response.errors.join());
                    }
                });
        } catch (err) {
            return Observable.throw(err);
        }
    };

    executor.documentAST = documentAST;

    return executor;
};
