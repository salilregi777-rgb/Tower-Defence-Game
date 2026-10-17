package sylva.ui;

import javax.swing.*;
import javax.swing.border.*;
import java.awt.*;

public final class Style {
    public static final Color BG=new Color(49,54,46),PANEL=new Color(57,64,53),PANEL2=new Color(65,73,59),LINE=new Color(167,180,135,75),TEXT=new Color(238,238,216),MUTED=new Color(199,204,175),DIM=new Color(155,166,132),ACCENT=new Color(207,220,163),GOLD=new Color(219,194,142);
    public static Font font(float size){return new Font("Avenir Next",Font.PLAIN,(int)size);}
    private Style(){}
    public static void base(JComponent c){c.setBackground(PANEL);c.setForeground(TEXT);c.setFont(font(12));c.setOpaque(false);}
    public static JPanel card(){JPanel p=new JPanel();p.setOpaque(true);p.setBackground(PANEL);p.setBorder(new CompoundBorder(new LineBorder(LINE,1,true),new EmptyBorder(14,15,14,15)));return p;}
    public static JButton button(String label){JButton b=new JButton(label);b.setFont(font(12));b.setForeground(TEXT);b.setBackground(PANEL2);b.setFocusPainted(false);b.setBorder(new CompoundBorder(new LineBorder(LINE,1,true),new EmptyBorder(9,12,9,12)));b.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));return b;}
    public static JButton primary(String label){JButton b=button(label);b.setBackground(new Color(222,225,200));b.setForeground(new Color(42,49,39));b.setBorder(new CompoundBorder(new LineBorder(new Color(239,237,212),1,true),new EmptyBorder(10,14,10,14)));return b;}
    public static JLabel eyebrow(String label){JLabel l=new JLabel(label.toUpperCase());l.setForeground(DIM);l.setFont(font(9).deriveFont(Font.BOLD));return l;}
    public static JLabel title(String text,int size){JLabel l=new JLabel(text);l.setForeground(TEXT);l.setFont(font(size));return l;}
    public static void section(JPanel panel,String name){JLabel l=eyebrow(name);l.setBorder(new EmptyBorder(8,0,4,0));panel.add(l);}
}
