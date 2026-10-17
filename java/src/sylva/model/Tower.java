package sylva.model;

import sylva.model.Rules.Stats;
import sylva.model.Rules.TargetMode;
import sylva.model.Rules.TowerKind;
import java.io.Serializable;

public final class Tower implements Serializable {
    public final int id,col,row; public final TowerKind kind;public int level=1;public Stats stats;public TargetMode mode=TargetMode.FIRST;public String upgradeNode="root";public int invested;public double cooldown,firedAt=-10;public int targetId=-1;
    public Tower(int id,TowerKind kind,int col,int row,double time){this.id=id;this.kind=kind;this.col=col;this.row=row;this.stats=new Stats(kind.damage,kind.range,kind.interval);this.invested=kind.cost;this.cooldown=.15;}
    public Tower copy(){Tower t=new Tower(id,kind,col,row,0);t.level=level;t.stats=stats.copy();t.mode=mode;t.upgradeNode=upgradeNode;t.invested=invested;t.cooldown=cooldown;t.firedAt=firedAt;t.targetId=targetId;return t;}
    public double x(){return col-8;}public double z(){return row-6;}
}
