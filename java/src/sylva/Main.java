package sylva;

import sylva.ui.*;
import javax.swing.*;
import java.awt.*;
import java.awt.image.BufferedImage;

public final class Main {
    private Main(){}
    public static void main(String[] args){SwingUtilities.invokeLater(()->{System.setProperty("awt.useSystemAAFontSettings","on");System.setProperty("swing.aatext","true");try{for(UIManager.LookAndFeelInfo info:UIManager.getInstalledLookAndFeels())if(info.getName().equals("Nimbus")){UIManager.setLookAndFeel(info.getClassName());break;}UIManager.put("Panel.background",Style.BG);UIManager.put("OptionPane.background",Style.BG);UIManager.put("OptionPane.messageForeground",Style.TEXT);}catch(Exception ignored){}new GameWindow();});}
}
