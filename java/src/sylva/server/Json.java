package sylva.server;

import java.util.*;

/** Small JSON codec for the localhost API; accepts only JSON values. */
final class Json {
    private Json() {}
    static Object parse(String text) { return new Parser(text).parse(); }
    static String stringify(Object value) { StringBuilder out=new StringBuilder();write(out,value);return out.toString(); }
    private static void write(StringBuilder b,Object v){
        if(v==null){b.append("null");return;} if(v instanceof String s){quote(b,s);return;} if(v instanceof Number n){double d=n.doubleValue();b.append(Double.isFinite(d)?n:"null");return;} if(v instanceof Boolean){b.append(v);return;}
        if(v instanceof Map<?,?> m){b.append('{');boolean first=true;for(var e:m.entrySet()){if(!first)b.append(',');first=false;quote(b,String.valueOf(e.getKey()));b.append(':');write(b,e.getValue());}b.append('}');return;}
        if(v instanceof Iterable<?> xs){b.append('[');boolean first=true;for(Object x:xs){if(!first)b.append(',');first=false;write(b,x);}b.append(']');return;}
        if(v.getClass().isArray()){b.append('[');for(int i=0;i<java.lang.reflect.Array.getLength(v);i++){if(i>0)b.append(',');write(b,java.lang.reflect.Array.get(v,i));}b.append(']');return;}
        quote(b,String.valueOf(v));
    }
    private static void quote(StringBuilder b,String s){b.append('"');for(int i=0;i<s.length();i++){char c=s.charAt(i);switch(c){case '"'->b.append("\\\"");case '\\'->b.append("\\\\");case '\n'->b.append("\\n");case '\r'->b.append("\\r");case '\t'->b.append("\\t");default->{if(c<32)b.append(String.format("\\u%04x",(int)c));else b.append(c);}}}b.append('"');}
    private static final class Parser {
        final String s;int i;Parser(String s){this.s=s;}
        Object parse(){Object v=value();space();if(i!=s.length())throw new IllegalArgumentException("Trailing JSON data");return v;}
        Object value(){space();if(i>=s.length())throw bad();char c=s.charAt(i);if(c=='"')return string();if(c=='{')return object();if(c=='[')return array();if(s.startsWith("true",i)){i+=4;return true;}if(s.startsWith("false",i)){i+=5;return false;}if(s.startsWith("null",i)){i+=4;return null;}return number();}
        Map<String,Object> object(){i++;Map<String,Object> m=new LinkedHashMap<>();space();if(take('}'))return m;do{space();if(i>=s.length()||s.charAt(i)!='"')throw bad();String k=string();space();expect(':');m.put(k,value());space();if(take('}'))return m;expect(',');}while(true);}
        List<Object> array(){i++;List<Object>a=new ArrayList<>();space();if(take(']'))return a;do{a.add(value());space();if(take(']'))return a;expect(',');}while(true);}
        String string(){expect('"');StringBuilder b=new StringBuilder();while(i<s.length()){char c=s.charAt(i++);if(c=='"')return b.toString();if(c=='\\'){if(i>=s.length())throw bad();char e=s.charAt(i++);switch(e){case '"','\\','/'->b.append(e);case 'b'->b.append('\b');case 'f'->b.append('\f');case 'n'->b.append('\n');case 'r'->b.append('\r');case 't'->b.append('\t');case 'u'->{if(i+4>s.length())throw bad();b.append((char)Integer.parseInt(s.substring(i,i+4),16));i+=4;}default->throw bad();}}else b.append(c);}throw bad();}
        Number number(){int a=i;if(take('-')){}while(i<s.length()&&Character.isDigit(s.charAt(i)))i++;boolean decimal=false;if(take('.')){decimal=true;while(i<s.length()&&Character.isDigit(s.charAt(i)))i++;}if(i<s.length()&&(s.charAt(i)=='e'||s.charAt(i)=='E')){decimal=true;i++;if(i<s.length()&&(s.charAt(i)=='+'||s.charAt(i)=='-'))i++;while(i<s.length()&&Character.isDigit(s.charAt(i)))i++;}if(a==i)throw bad();String n=s.substring(a,i);try{return decimal?Double.parseDouble(n):Long.parseLong(n);}catch(NumberFormatException e){throw bad();}}
        void space(){while(i<s.length()&&Character.isWhitespace(s.charAt(i)))i++;}boolean take(char c){if(i<s.length()&&s.charAt(i)==c){i++;return true;}return false;}void expect(char c){if(!take(c))throw bad();}IllegalArgumentException bad(){return new IllegalArgumentException("Malformed JSON at "+i);}
    }
}
