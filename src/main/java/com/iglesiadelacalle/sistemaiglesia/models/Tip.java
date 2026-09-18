package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "tip")
public class Tip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // ⚡ CORRECCIÓN: Autogeneración del ID
    private Integer idTip;

    @Column(length = 100, nullable = false, unique = true)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @ManyToOne
    @JoinColumn(name = "id_bloque", nullable = false)
    @JsonBackReference
    private Bloque bloque;

    public Integer getIdTip() { return idTip; }
    public void setIdTip(Integer idTip) { this.idTip = idTip; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public Bloque getBloque() { return bloque; }
    public void setBloque(Bloque bloque) { this.bloque = bloque; }
}