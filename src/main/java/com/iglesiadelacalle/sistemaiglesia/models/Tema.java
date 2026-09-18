package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "tema")
public class Tema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idTema;

    @Column(length = 150, nullable = false) // Aumenté el tamaño por si los temas son largos
    private String denominacion;

    // --- LLAVE FORÁNEA ---
    @ManyToOne
    @JoinColumn(name = "id_teologia", nullable = false)
    @JsonBackReference
    private Teologia teologia;

    // --- GETTERS Y SETTERS ---

    public Integer getIdTema() { return idTema; }
    public void setIdTema(Integer idTema) { this.idTema = idTema; }

    public String getDenominacion() { return denominacion; }
    public void setDenominacion(String denominacion) { this.denominacion = denominacion; }

    public Teologia getTeologia() { return teologia; }
    public void setTeologia(Teologia teologia) { this.teologia = teologia; }
}