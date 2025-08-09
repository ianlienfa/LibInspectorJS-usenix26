if (typeof QUnit !== "undefined") {
    QUnit.testStart(function( details ) {
        jalangiinstrumentation.analysis.beginExecution();
    });

    QUnit.testDone(function( details ) {
        jalangiinstrumentation.analysis.endExecution();
    });
}

