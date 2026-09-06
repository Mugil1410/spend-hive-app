import { useCallback, useState } from 'react';

const OPERATORS = ['+', '-', '×', '÷'];

function isOperator(ch: string | undefined): boolean {
  return !!ch && OPERATORS.includes(ch);
}

function currentSegment(expr: string): string {
  let lastOpIndex = -1;
  for (let i = expr.length - 1; i >= 0; i--) {
    if (isOperator(expr[i])) {
      lastOpIndex = i;
      break;
    }
  }
  return expr.slice(lastOpIndex + 1);
}

function evaluate(expr: string): number {
  let e = expr;
  while (e.length && isOperator(e[e.length - 1])) e = e.slice(0, -1);
  if (!e) return 0;

  const tokens = e.match(/\d+\.?\d*|[+\-×÷]/g);
  if (!tokens || !tokens.length) return 0;

  const pass1: (number | string)[] = [parseFloat(tokens[0]) || 0];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const num = parseFloat(tokens[i + 1]) || 0;
    if (op === '×' || op === '÷') {
      const prev = pass1.pop() as number;
      pass1.push(op === '×' ? prev * num : num !== 0 ? prev / num : prev);
    } else {
      pass1.push(op, num);
    }
  }

  let result = pass1[0] as number;
  for (let i = 1; i < pass1.length; i += 2) {
    const op = pass1[i];
    const num = pass1[i + 1] as number;
    result = op === '+' ? result + num : result - num;
  }
  return result;
}

function formatResult(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

export function useAmountInput(initial = '0') {
  const [raw, setRaw] = useState(initial);
  const [justEvaluated, setJustEvaluated] = useState(false);

  const handleKey = useCallback((key: string) => {
    if (key === 'C') {
      setRaw('0');
      setJustEvaluated(false);
      return;
    }

    if (key === 'DEL') {
      setJustEvaluated(false);
      setRaw((prev) => {
        const next = prev.slice(0, -1);
        return next.length === 0 ? '0' : next;
      });
      return;
    }

    if (key === '=') {
      setRaw((prev) => formatResult(evaluate(prev)));
      setJustEvaluated(true);
      return;
    }

    if (isOperator(key)) {
      setRaw((prev) => {
        if (isOperator(prev[prev.length - 1])) return prev.slice(0, -1) + key;
        return prev + key;
      });
      setJustEvaluated(false);
      return;
    }

    // digit or '.'
    setRaw((prev) => {
      const base = justEvaluated ? '0' : prev;
      const lastChar = base[base.length - 1];

      if (isOperator(lastChar) || base === '0') {
        if (key === '.') return (isOperator(lastChar) ? base : '') + '0.';
        return isOperator(lastChar) ? base + key : key;
      }

      const segment = currentSegment(base);
      if (key === '.') {
        return segment.includes('.') ? base : base + '.';
      }
      const decimalIndex = segment.indexOf('.');
      if (decimalIndex !== -1 && segment.length - decimalIndex > 2) return base;
      return base + key;
    });
    setJustEvaluated(false);
  }, [justEvaluated]);

  const reset = useCallback((value = '0') => {
    setRaw(value);
    setJustEvaluated(false);
  }, []);

  const numericValue = evaluate(raw);

  return { raw, numericValue, handleKey, reset };
}
