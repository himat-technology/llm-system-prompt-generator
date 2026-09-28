import { describe, expect, it } from "vitest";
import { checkXmlWellFormed, findUnbalancedTags, stripInvalidXmlChars, toCdata, toXmlContent } from "@/lib/xml-utils";

describe("checkXmlWellFormed", () => {
  it("accepts well-formed documents", () => {
    expect(checkXmlWellFormed('<?xml version="1.0"?>\n<a><b x="1">t &amp; u</b><c/><![CDATA[<raw>&]]></a>').valid).toBe(true);
  });

  it.each([
    ["<a><b></a>", /Mismatched/],
    ["<a>", /Unclosed/],
    ["</a>", /Unexpected closing/],
    ["<a>x & y</a>", /Unescaped '&'/],
    ["<a></a><b></b>", /Multiple root/],
    ["text", /No root|outside/],
    ["<a><![CDATA[x</a>", /Unterminated CDATA/],
  ])("rejects %s", (xml, error) => {
    const result = checkXmlWellFormed(xml);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(error);
  });
});

describe("CDATA helpers", () => {
  it("splits CDATA terminators", () => {
    const wrapped = toCdata("a]]>b");
    expect(wrapped).toBe("<![CDATA[a]]]]><![CDATA[>b]]>");
    expect(checkXmlWellFormed(`<r>${wrapped}</r>`).valid).toBe(true);
  });

  it("only uses CDATA when needed", () => {
    expect(toXmlContent("plain prose")).toEqual({ content: "plain prose", cdata: false });
    expect(toXmlContent("a < b").cdata).toBe(true);
  });
});

describe("findUnbalancedTags", () => {
  it("finds unclosed and stray tags", () => {
    expect(findUnbalancedTags("Use <answer> tags")).toEqual(["answer"]);
    expect(findUnbalancedTags("close </thinking> only")).toEqual(["thinking"]);
    expect(findUnbalancedTags("<a><b></a>")).toEqual(["b"]);
  });

  it("ignores balanced, self-closing, void and code-fenced tags", () => {
    expect(findUnbalancedTags("<answer>x</answer> <br> <img src='x'> <x/> `<div>` ```\n<p>\n```")).toEqual([]);
    expect(findUnbalancedTags("a < b and c > d")).toEqual([]);
  });

  it("ignores generic type arguments", () => {
    expect(findUnbalancedTags("Return Promise<User> and Array<string>; Map<K, V> too.")).toEqual([]);
    expect(findUnbalancedTags("Return Promise<User> inside <answer>")).toEqual(["answer"]);
  });
});

describe("stripInvalidXmlChars", () => {
  it("removes control characters and lone surrogates but keeps valid emoji", () => {
    expect(stripInvalidXmlChars("a\u0001b\u000Bc\uFFFE")).toBe("abc");
    expect(stripInvalidXmlChars("x\uD83Dy\uDE00z")).toBe("xyz");
    expect(stripInvalidXmlChars("ok \uD83D\uDE00 tab\tnl\n")).toBe("ok \uD83D\uDE00 tab\tnl\n");
  });
});
