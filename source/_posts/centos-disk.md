---
title: centos 磁盘挂载
categories:
  - Linux
tags:
  - Linux
date: 2024-01-29 13:10:53
updated: 2024-01-29 13:10:53
---
### 查看磁盘： 
> lsblk

### 格式化磁盘： 
> fdisk /dev/sdb
n->p->1->回车->回车->w

### 创建磁盘：
```shell
mkfs.xfs /dev/sdb1
mkdir /app
echo "/dev/sdb1 /app xfs defaults 0 0" >> /etc/fstab
mount -a
df -h
```

### LVM 磁盘管理
```shell

sudo vgdisplay  # 查看卷组剩余空间
sudo lvdisplay  # 查看逻辑卷详情

方法一：直接扩展现有逻辑卷（推荐）
# 扩展逻辑卷到最大可用空间（保留所有剩余空间）
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv

# 调整文件系统大小（ext4 适用）
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv

# 验证
df -h | grep /dev/mapper/ubuntu--vg-ubuntu--lv


方法二：创建新逻辑卷（如需独立挂载）‌

# 创建新逻辑卷（命名为 new-lv，分配 100G）
sudo lvcreate -n new-lv -L 100G ubuntu-vg

# 格式化
sudo mkfs.ext4 /dev/ubuntu-vg/new-lv

# 挂载到目录（如 /mnt/data）
sudo mkdir -p /mnt/data
sudo mount /dev/ubuntu-vg/new-lv /mnt/data

# 开机自动挂载
echo '/dev/ubuntu-vg/new-lv /mnt/data ext4 defaults 0 2' | sudo tee -a /etc/fstab


```

### LVM 收缩逻辑卷（缩小磁盘空间）

```shell
‌1. 前提条件‌
‌文件系统支持收缩‌：仅 ext2/3/4 和 xfs（有限支持）可缩小，且需先缩小文件系统，再缩小逻辑卷‌
‌数据备份‌：收缩操作可能导致数据丢失，‌必须提前备份重要数据‌‌68。
‌剩余空间检查‌：确保目标容量足够存放现有数据。

sudo umount /mnt/data  # 如果逻辑卷已挂载，需先卸载
sudo e2fsck -f /dev/vg_name/lv_name  # 强制检查 ext4 文件系统
sudo resize2fs /dev/vg_name/lv_name 50G  # 将文件系统缩小到 50G
sudo lvreduce -L 50G /dev/vg_name/lv_name  # 将逻辑卷缩小到 50G
sudo mount /dev/vg_name/lv_name /mnt/data # 重新挂载（如果之前卸载）
# 验证
df -h | grep lv_name  # 检查文件系统大小
sudo lvdisplay /dev/vg_name/lv_name  # 检查逻辑卷大小


场景 1：缩小根分区（/）‌
‌必须从 Live CD/USB 启动‌，因为根分区无法卸载‌
sudo lvresize --resizefs -L 50G /dev/ubuntu-vg/ubuntu-lv  # 自动调整文件系统和逻辑卷

```

### 在已创建新逻辑卷后再次扩容的完整步骤
```shell
sudo vgdisplay ubuntu-vg  # 查看卷组剩余空间（Free PE / Size）
场景 1：卷组仍有剩余空间
# 将 /dev/ubuntu-vg/data 扩容 20G（根据需求调整）
sudo lvextend -L +20G /dev/ubuntu-vg/data
# 调整文件系统（ext4 示例）
sudo resize2fs /dev/ubuntu-vg/data


场景 2：卷组无剩余空间（需先扩展物理卷）
‌步骤 1：扩展物理卷（PV）
# 查看物理卷路径（通常为 /dev/sda3）
sudo pvdisplay
# 扩展物理卷边界（假设 /dev/sda3 是 PV）
sudo pvresize /dev/sda3
‌步骤 2：确认卷组空间更新
sudo vgdisplay ubuntu-vg  # 此时应显示新的 Free PE / Size
步骤 3：扩容逻辑卷
sudo lvextend -L +30G /dev/ubuntu-vg/data  # 增加 30G
sudo resize2fs /dev/ubuntu-vg/data         # 调整文件系统

‌3. 高级操作：从磁盘新增物理卷‌
若物理磁盘 /dev/sda 已无剩余空间，需添加新磁盘（如 /dev/sdb）：
# 创建新分区并设为 LVM 类型（通过 fdisk/gdisk）
sudo fdisk /dev/sdb  # 创建新分区（如 /dev/sdb1），类型代码 8e（Linux LVM）

# 初始化物理卷
sudo pvcreate /dev/sdb1

# 扩展卷组
sudo vgextend ubuntu-vg /dev/sdb1

# 此时可继续扩展逻辑卷
sudo lvextend -L +50G /dev/ubuntu-vg/data
sudo resize2fs /dev/ubuntu-vg/data
# 验证
# 检查逻辑卷大小
sudo lvdisplay /dev/ubuntu-vg/data | grep "LV Size"
# 检查文件系统大小
df -h /挂载点  # 如 /data

```