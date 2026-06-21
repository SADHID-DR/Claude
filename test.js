const evaluateMathExpression = (expr) => {
    try {
      const withAsterisks = expr.replace(/[xX×]/g, "*");
      const sanitized = withAsterisks.replace(/[^\d.+\-*/() ]/g, "");
      if (!sanitized) return 0;
      const finalResult = new Function(`return ${sanitized}`)();
      return isNaN(finalResult) ? 0 : Number(finalResult);
    } catch {
      return 0;
    }
  };

console.log(evaluateMathExpression("=5x5".substring(1)));
console.log(evaluateMathExpression("=5X5".substring(1)));
console.log(evaluateMathExpression("=5*5".substring(1)));
